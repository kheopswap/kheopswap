import { useMemo } from "react";

import { useNativeToken } from "./useNativeToken";
import { usePoolReservesByTokenIds } from "./usePoolReservesByTokenIds";
import { useToken } from "./useToken";
import { useTokenChain } from "./useTokenChain";

import type { TokenId } from "@kheopswap/registry";
import { isBigInt, logger, plancksToTokens } from "@kheopswap/utils";
import { getAssetConvertPlancks } from "src/util/getAssetConvertPlancks";

type UseAssetConvertPlancks = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

// const getAssetHubConvertPlancks$ = ({
// 	tokenIdIn,
// 	tokenIdOut,
// 	plancks,
// }: UseAssetConvertPlancks) =>
// 	getCachedObservable$(
// 		"getAssetHubConvertPlancks$",
// 		[tokenIdIn, tokenIdOut, plancks?.toString()].join(","),
// 		() => {
// 			if (!tokenIdIn || !tokenIdOut) return of(null);

// 			if (!plancks) return of(null);

// 			const chainId = getChainIdFromTokenId(tokenIdIn);
// 			if (!chainId) return of(null);

// 			const nativeToken = getNativeToken(chainId);
// 			if (!nativeToken) return of(null);

// 			return of(null);

// 			// return combineLatest([getTokenById$(tokenIdIn), getTokenById$(tokenIdOut)]).pipe(
// 			// 	switchMap(([tokenInState, tokenOutState]) => {

// 			// 	})
// 			// )

// 			// const tokenIn = getTokenById$(tokenIdIn)

// 			// // TODO if tokens exist
// 			// // if(plancks === 0n) return of(0n)

// 			// return relayChains$.pipe(
// 			// 	switchMap(({ allChains }) =>
// 			// 		getPoolsByChainIds$(allChains.map((chain) => chain.id)),
// 			// 	),
// 			// 	map((dicChainsPoolsState) => {
// 			// 		const allStates = values(dicChainsPoolsState);
// 			// 		const isLoading = allStates.some(
// 			// 			(state) => state.status !== "loaded",
// 			// 		);
// 			// 		const arrPools = allStates
// 			// 			.flatMap((state) => values(state.pools))
// 			// 			.filter(
// 			// 				(pool) =>
// 			// 					pool.tokenIds.includes(tokenIdIn) &&
// 			// 					pool.tokenIds.includes(tokenIdOut),
// 			// 			);
// 			// 		const dicPools = keyBy(arrPools, "id");
// 			// 		return { isLoading, data: dicPools };
// 			// 	}),
// 			// 	shareReplay({ bufferSize: 1, refCount: true }),
// 			// );
// 		},
// 	);

export const useAssetConvertPlancks = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) => {
	const stop = logger.cumulativeTimer("useAssetConvertPlancks");
	const chain = useTokenChain({ tokenId: tokenIdIn });
	const nativeToken = useNativeToken({ chain });
	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });
	const { data: tokenOut } = useToken({ tokenId: tokenIdOut });

	const qNativeToTokenIn = usePoolReservesByTokenIds({
		tokenId1: nativeToken?.id,
		tokenId2: tokenIn?.id,
	});
	const qNativeToTokenOut = usePoolReservesByTokenIds({
		tokenId1: nativeToken?.id,
		tokenId2: tokenOut?.id,
	});

	const plancksOut = useMemo(() => {
		if (!plancks || !tokenOut || !nativeToken || !tokenIn) return undefined;

		const reserveNativeToToken =
			nativeToken.id !== tokenIn.id ? qNativeToTokenIn.data : [1n, 1n];
		const reserveNativeToStable =
			nativeToken.id !== tokenOut.id ? qNativeToTokenOut.data : [1n, 1n];

		if (!reserveNativeToToken || !reserveNativeToStable) return undefined;

		if ([...reserveNativeToStable, ...reserveNativeToToken].includes(0n))
			return undefined;

		return getAssetConvertPlancks(
			plancks,
			tokenIn,
			nativeToken,
			tokenOut,
			reserveNativeToToken as [bigint, bigint],
			reserveNativeToStable as [bigint, bigint],
		);
	}, [
		nativeToken,
		plancks,
		qNativeToTokenOut.data,
		qNativeToTokenIn.data,
		tokenOut,
		tokenIn,
	]);

	const isLoading =
		!isBigInt(plancksOut) &&
		(qNativeToTokenIn.isLoading || qNativeToTokenOut.isLoading);

	stop();

	// 2 dependant queries, and sometimes they may be invalid or unused. can't provide useQuery result accurately
	return {
		isLoading,
		plancksOut,
		tokenIn,
		tokenOut,
	};
};

export const useAssetConvertPrice = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) => {
	const stop = logger.cumulativeTimer("useAssetConvertPrice");
	const { plancksOut, isLoading, tokenIn, tokenOut } = useAssetConvertPlancks({
		tokenIdIn,
		tokenIdOut,
		plancks,
	});

	const output = useMemo(
		() => ({
			isLoading,
			price:
				isBigInt(plancksOut) && tokenOut
					? plancksToTokens(plancksOut, tokenOut.decimals)
					: undefined,
			tokenIn,
			tokenOut,
		}),
		[isLoading, plancksOut, tokenIn, tokenOut],
	);

	stop();

	return output;
};
