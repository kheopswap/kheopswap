import { useMemo } from "react";
import type { ChainId } from "../registry/chains/types";
import type { Token } from "../registry/tokens/types";
import { useTokensByChainIds } from "./useTokensByChainIds";

type UseTokensProps = {
	chainId: ChainId | null | undefined;
};

type UseTokensResult = {
	isLoading: boolean;
	data: Record<string, Token>;
};

export const useTokensByChainId = ({
	chainId,
}: UseTokensProps): UseTokensResult => {
	const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);

	return useTokensByChainIds({ chainIds });
};
