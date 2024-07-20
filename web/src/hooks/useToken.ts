import { useMemo } from "react";

import { useTokensByChainId } from "./useTokensByChainId";

import { TokenId, getChainIdFromTokenId } from "src/config/tokens";

type UseTokenProps = {
  tokenId: TokenId | null | undefined;
};

export const useToken = ({ tokenId }: UseTokenProps) => {
  const chainId = useMemo(() => getChainIdFromTokenId(tokenId), [tokenId]);

  const { data: tokens, isLoading } = useTokensByChainId({
    chainId,
  });

  const data = useMemo(() => {
    if (!tokenId) return null;
    return tokens?.find((a) => a.id === tokenId) ?? null;
  }, [tokenId, tokens]);

  return { data, isLoading };
};
