import type {
	TokenAsset,
	TokenForeignAsset,
	TokenNative,
} from "@kheopswap/registry";
import { uniq } from "lodash";
import { useMemo } from "react";
import {
	useNativeToken,
	usePoolsByChainId,
	useRelayChains,
	useToken,
	useTokensByChainId,
	useWallets,
} from "src/hooks";
import {
	type PoolWithPositions,
	usePoolWithPositions,
} from "./usePoolPositions";
import { usePoolsWithValuation } from "./usePoolsWithValuation";

export type LiquidityPoolRowData = PoolWithPositions & {
	token1: TokenNative;
	token2: TokenAsset | TokenForeignAsset;
};

export const useLiquidityPoolsTable = () => {
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });

	const { data: allTokens, isLoading: isLoadingTokens } = useTokensByChainId({
		chainId: assetHub.id,
	});

	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const isLoading = isLoadingTokens || isLoadingPools;

	const { data: poolsWithValuation } = usePoolsWithValuation({
		pools,
		tokens: allTokens,
		nativeToken,
		stableToken,
	});

	const { accounts } = useWallets();
	const addresses = useMemo(
		() => uniq(accounts.map((a) => a.address)),
		[accounts],
	);

	const { data: poolsWithPositions } = usePoolWithPositions({
		pools: poolsWithValuation,
		addresses,
	});

	const poolsRows = useMemo<LiquidityPoolRowData[]>(() => {
		return poolsWithPositions
			.map((poolsWithPositions) => ({
				...poolsWithPositions,
				token1: allTokens[poolsWithPositions.tokenIds[0]],
				token2: allTokens[poolsWithPositions.tokenIds[1]],
			}))
			.filter((rp): rp is LiquidityPoolRowData => !!rp.token1 && !!rp.token2);
	}, [allTokens, poolsWithPositions]);

	return { data: poolsRows, isLoading };
};
