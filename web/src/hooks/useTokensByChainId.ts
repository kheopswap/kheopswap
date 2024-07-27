import { useEffect, useMemo } from "react";

import { useTokensByChainIds } from "./useTokensByChainIds";

import { ChainId } from "src/config/chains";
import { Token } from "src/config/tokens";
import { subscribeTokensByChains } from "src/services/tokens";

type UseTokensProps = {
  chainId: ChainId | null | undefined;
};

type UseTokensResult = {
  isLoading: boolean;
  data: Token[];
};

export const useTokensByChainId = ({
  chainId,
}: UseTokensProps): UseTokensResult => {
  useEffect(() => {
    if (!chainId) return;

    const unsubscribe = subscribeTokensByChains([chainId]);

    return () => {
      unsubscribe();
    };
  }, [chainId]);

  const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);

  return useTokensByChainIds({ chainIds });
};
