import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";

import { type LoadingStatus } from "./common";

import { ChainId, getChains } from "src/config/chains";
import { logger } from "src/util";

/**
 * For services that need to poll/refresh data every x seconds and keep track of the loading status
 * @param label
 * @param refreshTimeout
 * @returns
 */
export const pollChainStatus = (label: string, refreshTimeout: number) => {
  logger.debug("pollChainStatus - %s - %dms", label, refreshTimeout);

  const loadingStatusByChain$ = new BehaviorSubject<
    Record<ChainId, LoadingStatus>
  >(
    Object.fromEntries(
      getChains().map((chain) => [chain.id, "stale"]),
    ) as Record<ChainId, LoadingStatus>,
  );

  const setLoadingStatus = (
    chainId: ChainId | ChainId[],
    status: LoadingStatus,
  ) => {
    const chainIds = Array.isArray(chainId) ? chainId : [chainId];

    loadingStatusByChain$.next({
      ...loadingStatusByChain$.value,
      ...chainIds.reduce((acc, id) => ({ ...acc, [id]: status }), {}),
    });
  };

  const staleWatchCache = new Map<ChainId, number>();

  loadingStatusByChain$.subscribe((statusByChain) => {
    for (const key in statusByChain) {
      const chainId = key as ChainId;

      if (
        statusByChain[chainId] === "loaded" &&
        !staleWatchCache.has(chainId)
      ) {
        staleWatchCache.set(
          chainId,
          setTimeout(() => {
            if (staleWatchCache.has(chainId)) {
              if (loadingStatusByChain$.value[chainId] === "loaded")
                setLoadingStatus(chainId, "stale");
            }
          }, refreshTimeout),
        );
      }

      if (statusByChain[chainId] !== "loaded" && staleWatchCache.has(chainId)) {
        clearTimeout(staleWatchCache.get(chainId)!);
        staleWatchCache.delete(chainId);
      }
    }
  });

  const getLoadingStatus$ = (chainId: ChainId) => {
    return loadingStatusByChain$.pipe(
      map((statusByChain) => statusByChain[chainId]),
      distinctUntilChanged(),
    );
  };

  return {
    setLoadingStatus,
    getLoadingStatus$,
    loadingStatusByChain$,
  };
};
