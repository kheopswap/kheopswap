import { bind } from "@react-rxjs/core";
import { useEffect } from "react";
import { map } from "rxjs";

import { ChainId } from "src/config/chains";
import { Token } from "src/config/tokens";
import { getTokensByChain$, subscribeTokensByChain } from "src/services/tokens";

type UseTokensProps = {
  chainId: ChainId | null | undefined;
};

type UseTokensResult = {
  isLoading: boolean;
  data: Token[];
};

const [useTokensByChain] = bind((chainId: ChainId | null | undefined) => {
  return getTokensByChain$(chainId ?? null).pipe(
    map((statusAndTokens) => ({
      isLoading: statusAndTokens.status !== "loaded",
      data: statusAndTokens.tokens,
    })),
  );
});

export const useTokensByChainId = ({
  chainId,
}: UseTokensProps): UseTokensResult => {
  useEffect(() => {
    if (!chainId) return;

    const unsubscribe = subscribeTokensByChain(chainId);

    return () => {
      unsubscribe();
    };
  }, [chainId]);

  return useTokensByChain(chainId);
};
