import { useMemo } from "react";

import { useRelayChains } from "./useRelayChains";
import { useTokensByChainIds } from "./useTokensByChainIds";

import { TokenType } from "src/config/tokens/types";

type UseAllTokensProps = {
	types?: TokenType[];
};

const DEFAULT_TOKEN_TYPES: TokenType[] = ["native", "asset", "pool-asset"];

export const useAllTokens = ({
	types = DEFAULT_TOKEN_TYPES,
}: UseAllTokensProps) => {
	const { allChains } = useRelayChains();

	const chainIds = useMemo(
		() => allChains.map((chain) => chain.id),
		[allChains],
	);

	const { data: allTokens, isLoading } = useTokensByChainIds({
		chainIds,
	});
	const data = useMemo(
		() => allTokens.filter((t) => types.includes(t.type)),
		[allTokens, types],
	);

	return { data, isLoading: isLoading };
};
