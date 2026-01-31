import type { ChainId, Token } from "@kheopswap/registry";
import { useMemo } from "react";
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
