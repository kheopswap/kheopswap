import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

import { ChainId } from "src/config/chains";
import { Token } from "src/config/tokens";
import { getTokensByChains$ } from "src/services/tokens";
import { sortTokens } from "src/services/tokens/util";

type UseTokensByChainIdsProps = {
  chainIds: ChainId[];
};

type UseTokensByChainIdsResult = {
  isLoading: boolean;
  data: Token[];
};

export const useTokensByChainIds = ({
  chainIds,
}: UseTokensByChainIdsProps): UseTokensByChainIdsResult => {
  const tokens$ = useMemo(
    () =>
      getTokensByChains$(chainIds).pipe(
        map((tokensByChains) => ({
          isLoading: Object.values(tokensByChains).some(
            (statusAndTokens) => statusAndTokens.status !== "loaded",
          ),
          data: Object.values(tokensByChains)
            .flatMap((statusAndTokens) => statusAndTokens.tokens)
            .sort(sortTokens),
        })),
      ),
    [chainIds],
  );

  return useObservable(tokens$, { isLoading: !chainIds.length, data: [] });
};
