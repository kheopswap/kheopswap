import { BehaviorSubject, combineLatest } from "rxjs";
import { groupBy } from "lodash";

import { poolsStore$ } from "./store";
import { Pool } from "./types";
import { chainPoolsStatuses$ } from "./watchers";

import { LoadingStatus } from "src/services/common";
import { ChainId } from "src/config/chains";
import { logger } from "src/util";

const combineState = (
  statusByChain: Record<ChainId, LoadingStatus>,
  allPools: Pool[],
): Record<ChainId, { status: LoadingStatus; pools: Pool[] }> => {
  try {
    const poolsByChain = groupBy(allPools, "chainId");

    return Object.fromEntries(
      Object.entries(statusByChain).map(([chainId, status]) => [
        chainId,
        {
          status,
          pools: poolsByChain[chainId] ?? [],
        },
      ]),
    ) as Record<ChainId, { status: LoadingStatus; pools: Pool[] }>;
  } catch (err) {
    logger.error("Failed to merge pools state", { err });
    return {} as Record<ChainId, { status: LoadingStatus; pools: Pool[] }>;
  }
};

// main datasource of the service
export const poolsByChainState$ = new BehaviorSubject<
  Record<ChainId, { status: LoadingStatus; pools: Pool[] }>
>(combineState(chainPoolsStatuses$.value, poolsStore$.value));

// keep subject up to date
combineLatest([chainPoolsStatuses$, poolsStore$]).subscribe(
  ([statusByChain, allPools]) => {
    poolsByChainState$.next(combineState(statusByChain, allPools));
  },
);
