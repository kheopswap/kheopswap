import { BehaviorSubject, combineLatest } from "rxjs";
import { groupBy } from "lodash";

import { tokensStore$ } from "./store";
import { sortTokens } from "./util";
import { chainTokensStatuses$ } from "./watchers";

import { Token } from "src/config/tokens";
import { type LoadingStatus } from "src/services/common";
import { ChainId } from "src/config/chains";
import { logger } from "src/util";

type ChainTokensState = { status: LoadingStatus; tokens: Token[] };

const combineState = (
  statusByChain: Record<ChainId, LoadingStatus>,
  allTokens: Token[],
): Record<ChainId, ChainTokensState> => {
  try {
    const tokensByChain = groupBy(allTokens.sort(sortTokens), "chainId");

    return Object.fromEntries(
      Object.entries(statusByChain).map(([chainId, status]) => [
        chainId,
        {
          status,
          tokens: tokensByChain[chainId as ChainId] ?? [],
        },
      ]),
    ) as Record<ChainId, ChainTokensState>;
  } catch (err) {
    logger.error("Failed to merge tokens state", { err });
    return {} as Record<ChainId, ChainTokensState>;
  }
};

// main datasource of the service
export const tokensByChainState$ = new BehaviorSubject<
  Record<ChainId, ChainTokensState>
>(combineState(chainTokensStatuses$.value, tokensStore$.value));

// keep subject up to date
combineLatest([chainTokensStatuses$, tokensStore$]).subscribe(
  ([statusByChain, allTokens]) => {
    tokensByChainState$.next(combineState(statusByChain, allTokens));
  },
);
