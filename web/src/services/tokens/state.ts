import { BehaviorSubject, combineLatest } from "rxjs";

import { tokensStore$ } from "./store";
import { sortTokens } from "./util";
import { chainTokensStatuses$ } from "./watchers";

import { Token } from "src/config/tokens";
import { LoadingStatus } from "src/services/common";
import { ChainId } from "src/config/chains";

const getChainValue = (
  chainId: ChainId,
  statuses: Record<ChainId, LoadingStatus>,
  tokens: Token[],
) => ({
  status: statuses[chainId],
  tokens: tokens.filter((t) => t.chainId === chainId).sort(sortTokens),
});

// main datasource of the service
export const tokensByChainState$ = new BehaviorSubject<
  Record<ChainId, { status: LoadingStatus; tokens: Token[] }>
>(
  Object.keys(chainTokensStatuses$.subject$.value).reduce(
    (acc, chainId) => ({
      ...acc,
      [chainId]: getChainValue(
        chainId as ChainId,
        chainTokensStatuses$.subject$.value,
        tokensStore$.value,
      ),
    }),
    {} as Record<ChainId, { status: LoadingStatus; tokens: Token[] }>,
  ),
);

// keep subject up to date
combineLatest([chainTokensStatuses$.subject$, tokensStore$]).subscribe(
  ([statusByChain, allTokens]) => {
    tokensByChainState$.next(
      Object.keys(statusByChain).reduce(
        (acc, chainId) => ({
          ...acc,
          [chainId]: getChainValue(
            chainId as ChainId,
            statusByChain,
            allTokens,
          ),
        }),
        {} as Record<ChainId, { status: LoadingStatus; tokens: Token[] }>,
      ),
    );
  },
);
