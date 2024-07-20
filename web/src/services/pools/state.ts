import { BehaviorSubject, combineLatest } from "rxjs";

import { poolsStore$ } from "./store";
import { Pool } from "./types";
import { chainPoolsLoadingStatuses } from "./watchers";

import { LoadingStatus } from "src/services/common";
import { ChainId } from "src/config/chains";

const getChainValue = (
  chainId: ChainId,
  statuses: Record<ChainId, LoadingStatus>,
  pools: Pool[],
) => ({
  status: statuses[chainId],
  pools: pools.filter((t) => t.chainId === chainId),
});

// main datasource of the service
export const poolsByChainState$ = new BehaviorSubject<
  Record<ChainId, { status: LoadingStatus; pools: Pool[] }>
>(
  Object.keys(chainPoolsLoadingStatuses.subject$.value).reduce(
    (acc, chainId) => ({
      ...acc,
      [chainId]: getChainValue(
        chainId as ChainId,
        chainPoolsLoadingStatuses.subject$.value,
        poolsStore$.value,
      ),
    }),
    {} as Record<ChainId, { status: LoadingStatus; pools: Pool[] }>,
  ),
);

// keep subject up to date
combineLatest([chainPoolsLoadingStatuses.subject$, poolsStore$]).subscribe(
  ([statusByChain, allPools]) => {
    poolsByChainState$.next(
      Object.keys(statusByChain).reduce(
        (acc, chainId) => ({
          ...acc,
          [chainId]: getChainValue(chainId as ChainId, statusByChain, allPools),
        }),
        {} as Record<ChainId, { status: LoadingStatus; pools: Pool[] }>,
      ),
    );
  },
);
