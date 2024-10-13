import { useMemo } from "react";

import { useTokensByChainIds } from "./useTokensByChainIds";

import type { ChainId } from "@kheopswap/registry";
import type { Token } from "@kheopswap/registry";
import type { Dictionary } from "lodash";

type UseTokensProps = {
	chainId: ChainId | null | undefined;
};

type UseTokensResult = {
	isLoading: boolean;
	data: Dictionary<Token>;
};

export const useTokensByChainId = ({
	chainId,
}: UseTokensProps): UseTokensResult => {
	const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);

	return useTokensByChainIds({ chainIds });
};
