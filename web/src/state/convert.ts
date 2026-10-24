import {
	combineLatest,
	from,
	map,
	type Observable,
	of,
	shareReplay,
	throttleTime,
} from "rxjs";
import { getApi } from "../papi/getApi";
import type { ChainIdAssetHub } from "../registry/chains/types";
import { getChainIdFromTokenId, getTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import { getPoolReserves$ } from "../services/pools/reserves";
import { getAssetConvertPlancks } from "../utils/getAssetConvertPlancks";
import { getCachedObservable$ } from "../utils/getCachedObservable";

type Reserves = [bigint, bigint];

export type AssetConvertReserves = {
	nativeTokenId: TokenId;
	reservesNativeToTokenIn: Reserves;
	reservesNativeToTokenOut: Reserves;
};

type AssetConvertReservesState = {
	reserves: AssetConvertReserves | null;
	isLoading: boolean;
};

type AssetConvertInput = {
	tokenIdIn: TokenId;
	plancksIn: bigint;
	tokenIdOut: TokenId;
};

type AssetConvertResult = AssetConvertInput & {
	plancksOut: bigint | null;
	isLoading: boolean;
};

type AssetConvertMultiResult = {
	data: AssetConvertResult[];
	isLoading: boolean;
};

const NO_RESERVES: AssetConvertReservesState = {
	reserves: null,
	isLoading: false,
};

const getReservesFromNative$ = (nativeTokenId: TokenId, tokenId: TokenId) =>
	tokenId === nativeTokenId
		? of({ reserves: [1n, 1n] as Reserves, isLoading: false })
		: getPoolReserves$(nativeTokenId, tokenId);

export const getAssetConvertReserves$ = (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
): Observable<AssetConvertReservesState> =>
	getCachedObservable$(
		"getAssetConvertReserves$",
		`${tokenIdIn},${tokenIdOut}`,
		() => {
			const chainIdIn = getChainIdFromTokenId(tokenIdIn);
			const chainIdOut = getChainIdFromTokenId(tokenIdOut);
			if (!chainIdIn || !chainIdOut || chainIdIn !== chainIdOut)
				return of(NO_RESERVES);

			const nativeTokenId = getTokenId({ type: "native", chainId: chainIdIn });

			return combineLatest([
				getReservesFromNative$(nativeTokenId, tokenIdIn),
				getReservesFromNative$(nativeTokenId, tokenIdOut),
			]).pipe(
				map(([reservesIn, reservesOut]) => ({
					reserves:
						reservesIn.reserves && reservesOut.reserves
							? {
									nativeTokenId,
									reservesNativeToTokenIn: reservesIn.reserves,
									reservesNativeToTokenOut: reservesOut.reserves,
								}
							: null,
					isLoading: reservesIn.isLoading || reservesOut.isLoading,
				})),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);

export const getAssetConvert$ = ({
	tokenIdIn,
	tokenIdOut,
	plancksIn,
}: AssetConvertInput): Observable<AssetConvertResult> =>
	getAssetConvertReserves$(tokenIdIn, tokenIdOut).pipe(
		map(({ reserves, isLoading }) => ({
			tokenIdIn,
			tokenIdOut,
			plancksIn,
			isLoading,
			plancksOut: reserves
				? (getAssetConvertPlancks(
						plancksIn,
						tokenIdIn,
						reserves.nativeTokenId,
						tokenIdOut,
						reserves.reservesNativeToTokenIn,
						reserves.reservesNativeToTokenOut,
					) ?? null)
				: null,
		})),
	);

export const getAssetConvertMulti$ = (
	inputs: AssetConvertInput[],
): Observable<AssetConvertMultiResult> =>
	combineLatest(inputs.map(getAssetConvert$)).pipe(
		throttleTime(200, undefined, { leading: true, trailing: true }),
		map((data) => ({
			data,
			isLoading: data.some(({ isLoading }) => isLoading),
		})),
	);

export const getAssetConversionLpFee$ = (
	chainId: ChainIdAssetHub,
): Observable<number> =>
	getCachedObservable$("getAssetConversionLpFee$", chainId, () =>
		from(
			getApi(chainId).then((api) => api.constants.AssetConversion.LPFee()),
		).pipe(shareReplay({ bufferSize: 1, refCount: true })),
	);
