import { useMemo } from "react";

import { useRelayChains } from "./useRelayChains";
import { useTokensByChainIds } from "./useTokensByChainIds";

import type { TokenType } from "@kheopswap/registry";
import { keyBy, values } from "lodash";

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
		() =>
			keyBy(
				values(allTokens).filter((t) => types.includes(t.type)),
				"id",
			),
		[allTokens, types],
	);

	return { data, isLoading: isLoading };
};
