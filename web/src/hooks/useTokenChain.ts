import { useMemo } from "react";

import { useRelayChains } from "./useRelayChains";

import { TokenId, parseTokenId } from "src/config/tokens";
import { Chain } from "src/config/chains";

type UseTokenChain = {
  tokenId?: TokenId | null | undefined;
};

export const useTokenChain = ({ tokenId }: UseTokenChain) => {
  const { relay, assetHub } = useRelayChains();

  return useMemo<Chain | null>(() => {
    if (!tokenId) return null;
    const parsed = parseTokenId(tokenId);
    return (
      [relay, assetHub].find((chain) => chain.id === parsed.chainId) ?? null
    );
  }, [assetHub, relay, tokenId]);
};
