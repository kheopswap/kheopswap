import type { Token } from "@kheopswap/registry";
import { keyBy, values } from "lodash-es";
import { useMemo } from "react";
import {
	usePoolSupplies,
	usePoolsByChainId,
	useTokensByChainId,
} from "src/hooks";
import { useRelayChains } from "src/state";

type UseSwapTokensResult = {
	/** Map of swappable tokens by token ID */
	tokens: Record<string, Token>;
	/** Whether tokens/pools are still loading */
	isLoadingTokens: boolean;
};

/**
 * Provides the list of tokens available for swapping.
 *
 * A token is swappable if:
 * - It's the native token, OR
 * - It has a liquidity pool with non-zero supply
 *
 * This filters out tokens that have pools but no liquidity.
 */
export const useSwapTokens = (): UseSwapTokensResult => {
	const { assetHub } = useRelayChains();

	const { data: allTokens, isLoading: isLoadingAllTokens } = useTokensByChainId(
		{
			chainId: assetHub.id,
		},
	);

	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const pairs = useMemo(() => pools?.map((p) => p.tokenIds) ?? [], [pools]);

	const { data: poolSupplies } = usePoolSupplies({ pairs });

	const [tokens, isLoadingTokens] = useMemo(() => {
		const swappableAssetIds =
			pools
				?.filter((p) => {
					const supplyState = poolSupplies.find(
						(s) =>
							s.pair.includes(p.tokenIds[0]) && s.pair.includes(p.tokenIds[1]),
					);
					return !!supplyState?.supply;
				})
				.flatMap((p) => p.tokenIds) ?? [];
		return [
			keyBy(
				values(allTokens).filter(
					(t) => t.type === "native" || swappableAssetIds.includes(t.id),
				) ?? [],
				"id",
			),
			isLoadingAllTokens ||
				isLoadingPools ||
				poolSupplies.some((s) => s.isLoading),
		];
	}, [allTokens, isLoadingAllTokens, isLoadingPools, poolSupplies, pools]);

	return { tokens, isLoadingTokens };
};
