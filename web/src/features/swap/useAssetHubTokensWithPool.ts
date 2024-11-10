import { values } from "lodash";
import { useMemo } from "react";

import { usePoolsByChainId, useTokensByChainId } from "src/hooks";
import { useRelayChains } from "src/state";

export const useAssetHubTokensWithPool = () => {
	const { assetHub } = useRelayChains();

	const { data: tokens, isLoading: isLoadingTokens } = useTokensByChainId({
		chainId: assetHub.id,
	});
	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const [tokensWithPools, isLoading] = useMemo(() => {
		if (!tokens || !pools) return [[], true];
		const tokensWithPools = values(tokens).filter((token) =>
			pools.some((pool) => pool.tokenIds.includes(token.id)),
		);
		return [tokensWithPools, isLoadingTokens || isLoadingPools];
	}, [isLoadingPools, isLoadingTokens, pools, tokens]);

	return { data: tokensWithPools, isLoading };
};
