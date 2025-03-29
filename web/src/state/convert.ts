import {
	type ChainAssetHub,
	PARA_ID_ASSET_HUB,
	type TokenId,
	getChainById,
	getChainIdFromTokenId,
	getChains,
	getTokenId,
	getTokenSpecs,
	isChainIdAssetHub,
} from "@kheopswap/registry";

import { getTokenById$, getTokensByChain$ } from "@kheopswap/services/tokens";
import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	loadableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { values } from "lodash";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
	switchMap,
	throttleTime,
} from "rxjs";
import { getAssetConvertPlancks } from "src/util";
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

// ouputs equivalent value of the asset based on reserves, it does not take any fee into account
export const getAssetConvert$ = ({
	tokenIdIn,
	tokenIdOut,
	plancksIn,
}: AssetConvertInput): Observable<AssetConvertResult> =>
	getAssetConvertLoadable$(tokenIdIn, tokenIdOut, plancksIn).pipe(
		map(({ data: plancksOut, isLoading }) => ({
			tokenIdIn,
			tokenIdOut,
			plancksIn,
			plancksOut: plancksOut ?? null,
			isLoading,
		})),
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

const getAhTokenId$ = (
	tokenIdIn: TokenId | null | undefined,
): Observable<LoadableState<TokenId | null>> => {
	if (!tokenIdIn) return of(loadableData(null));

	const chainId = getChainIdFromTokenId(tokenIdIn);
	if (isChainIdAssetHub(chainId)) return of(loadableData(tokenIdIn));

	return getTokenById$(tokenIdIn).pipe(
		switchMap(({ status: status1, token }) => {
			const tokenOrigin = token && "origin" in token && token.origin;

			if (tokenOrigin) {
				const specs = getTokenSpecs(tokenOrigin);
				if (isChainIdAssetHub(specs.chainId))
					return of(loadableData(tokenOrigin));
			}

			const chain = getChainById(chainId);
			if (!chain) return of(loadableData(null));

			const ah = getChains().find(
				(c) => c.paraId === PARA_ID_ASSET_HUB && c.relay === chain.relay,
			) as ChainAssetHub;
			if (!ah) return of(loadableData(null));

			return getTokensByChain$(ah.id).pipe(
				map(({ status: status2, tokens }) => {
					const ahToken = values(tokens).find(
						(t) =>
							"origin" in t &&
							(t.origin === tokenIdIn || t.origin === tokenOrigin),
					);
					if (ahToken) return loadableData(ahToken.id);

					return loadableData(
						null,
						status1 !== "loaded" || status2 !== "loaded",
					);
				}),
			);
		}),
	);
};

// raw converted value based on AH reserves, without taking account any app or lp fee
export const [useAssetConvertLoadable, getAssetConvertLoadable$] = bind(
	(
		tokenIdIn: TokenId | null | undefined,
		tokenIdOut: TokenId | null | undefined,
		plancksIn: bigint | null | undefined,
	): Observable<LoadableState<bigint | null>> => {
		if (!tokenIdIn || !tokenIdOut || !isBigInt(plancksIn))
			return of(loadableData(null));

		if (tokenIdIn === tokenIdOut) return of(loadableData(plancksIn));

		const getReserves$ = (tid1: TokenId, tid2: TokenId) => {
			if (tid1 === tid2)
				return of({
					reserves: [1n, 1n] as [bigint, bigint],
					isLoading: false,
				});
			return getPoolReserves$(tid1, tid2);
		};

		return combineLatest([
			getAhTokenId$(tokenIdIn),
			getAhTokenId$(tokenIdOut),
		]).pipe(
			switchMap(([lsAhTokenIdIn, lsAhTokenIdOut]) => {
				const ahTokenIdIn = lsAhTokenIdIn.data;
				const ahTokenIdOut = lsAhTokenIdOut.data;

				if (!ahTokenIdIn || !ahTokenIdOut)
					return of(
						loadableData(
							null,
							lsAhTokenIdIn.isLoading || lsAhTokenIdOut.isLoading,
						),
					);

				const ahTokenInSpecs = getTokenSpecs(ahTokenIdIn);

				const nativeTokenId = getTokenId({
					type: "native",
					chainId: ahTokenInSpecs.chainId,
				});

				return combineLatest([
					getReserves$(nativeTokenId, ahTokenIdIn),
					getReserves$(nativeTokenId, ahTokenIdOut),
				]).pipe(
					map(
						([
							{ reserves: reserveNativeToTokenIn, isLoading: isLoadingPool1 },
							{ reserves: reserveNativeToTokenOut, isLoading: isLoadingPool2 },
						]) => {
							if (!reserveNativeToTokenIn || !reserveNativeToTokenOut)
								return loadableData(null, isLoadingPool1 || isLoadingPool2);

							const plancksOut =
								getAssetConvertPlancks(
									plancksIn,
									ahTokenIdIn,
									nativeTokenId,
									ahTokenIdOut,
									reserveNativeToTokenIn,
									reserveNativeToTokenOut,
								) ?? null;

							return loadableData(plancksOut, isLoadingPool1 || isLoadingPool2);
						},
					),
					catchError((err) => of(loadableError<bigint | null>(err))),
				);
			}),
		);
	},
	loadableLoading<bigint | null>(),
);
