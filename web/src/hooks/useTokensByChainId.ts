import { useMemo } from "react";

import { useTokensByChainIds } from "./useTokensByChainIds";

import { ChainId } from "src/config/chains";
import { Token } from "src/config/tokens";

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
  const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);

  return useTokensByChainIds({ chainIds });
};
