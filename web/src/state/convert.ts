import {
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	throttleTime,
} from "rxjs";
import { getChainIdFromTokenId, getTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import { getAssetConvertPlancks } from "../utils/getAssetConvertPlancks";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { getPoolReserves$ } from "./pools";

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

export const getAssetConvert$ = ({
	tokenIdIn,
	tokenIdOut,
	plancksIn,
}: AssetConvertInput): Observable<AssetConvertResult> =>
	getCachedObservable$(
		"getAssetConvert$",
		[tokenIdIn, tokenIdOut, plancksIn].join(","),
		() => {
			const returnValue = (plancksOut: bigint | null, isLoading: boolean) => ({
				tokenIdIn,
				tokenIdOut,
				plancksIn,
				plancksOut,
				isLoading,
			});

			if (!tokenIdIn || !tokenIdOut) return of(returnValue(null, false));

			const chainId1 = getChainIdFromTokenId(tokenIdIn);
			const chainId2 = getChainIdFromTokenId(tokenIdOut);

			if (!chainId1 || !chainId2 || chainId1 !== chainId2)
				return of(returnValue(null, false));

			const nativeTokenId = getTokenId({ type: "native", chainId: chainId1 });

			const getReserves$ = (tid1: TokenId, tid2: TokenId) => {
				if (tid1 === tid2)
					return of({
						reserves: [1n, 1n] as [bigint, bigint],
						isLoading: false,
					});
				return getPoolReserves$(tid1, tid2);
			};

			return combineLatest([
				getReserves$(nativeTokenId, tokenIdIn),
				getReserves$(nativeTokenId, tokenIdOut),
			]).pipe(
				map(
					([
						{ reserves: reserveNativeToTokenIn, isLoading: isLoadingPool1 },
						{ reserves: reserveNativeToTokenOut, isLoading: isLoadingPool2 },
					]) => {
						if (!reserveNativeToTokenIn || !reserveNativeToTokenOut)
							return returnValue(null, isLoadingPool1 || isLoadingPool2);

						const plancksOut =
							getAssetConvertPlancks(
								plancksIn,
								tokenIdIn,
								nativeTokenId,
								tokenIdOut,
								reserveNativeToTokenIn,
								reserveNativeToTokenOut,
							) ?? null;

						return returnValue(plancksOut, isLoadingPool1 || isLoadingPool2);
					},
				),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);

export const getAssetConvertMulti$ = (
	inputs: AssetConvertInput[],
): Observable<AssetConvertMultiResult> => {
	return combineLatest(inputs.map((input) => getAssetConvert$(input))).pipe(
		throttleTime(200, undefined, { leading: true, trailing: true }),
		map((data) => ({
			data,
			isLoading: data.some(({ isLoading }) => isLoading),
		})),
	);
};
