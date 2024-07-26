import { bind } from "@react-rxjs/core";
import { useEffect, useMemo } from "react";
import { map } from "rxjs";

import { ChainId } from "src/config/chains";
import { Token } from "src/config/tokens";
import {
  getTokensByChains$,
  subscribeTokensByChains,
} from "src/services/tokens";
import { sortTokens } from "src/services/tokens/util";

type UseTokensByChainIdsProps = {
  chainIds: ChainId[];
};

type UseTokensByChainIdsResult = {
  isLoading: boolean;
  data: Token[];
};

type SerializedChainIds = string;

const serializeChainIds = (chainIds: ChainId[]): SerializedChainIds =>
  [...new Set(chainIds)].sort().join("::");

const deserializeChainIds = (chainIds: SerializedChainIds) => [
  ...new Set<ChainId>(chainIds.split("::").filter((id): id is ChainId => !!id)),
];

const [useTokensByChains] = bind((strChainIds: SerializedChainIds) => {
  const chainIds = deserializeChainIds(strChainIds);

  return getTokensByChains$(chainIds).pipe(
    map((tokensByChains) => ({
      isLoading: Object.values(tokensByChains).some(
        (statusAndTokens) => statusAndTokens.status !== "loaded",
      ),
      data: Object.values(tokensByChains)
        .flatMap((statusAndTokens) => statusAndTokens.tokens)
        .sort(sortTokens),
    })),
  );
});

export const useTokensByChainIds = ({
  chainIds,
}: UseTokensByChainIdsProps): UseTokensByChainIdsResult => {
  useEffect(() => {
    if (!chainIds) return;

    const unsubscribe = subscribeTokensByChains(chainIds);

    return () => {
      unsubscribe();
    };
  }, [chainIds]);

  // serialize hook args to prevent infinite re-render loop
  const strBalanceIds = useMemo(() => serializeChainIds(chainIds), [chainIds]);

  return useTokensByChains(strBalanceIds);
};
