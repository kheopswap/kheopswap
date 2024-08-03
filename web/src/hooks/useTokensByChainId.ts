import { useMemo } from "react";

import { useTokensByChainIds } from "./useTokensByChainIds";

import type { Dictionary } from "lodash";
import type { ChainId } from "src/config/chains";
import type { Token } from "src/config/tokens";

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
