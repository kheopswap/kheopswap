import { BehaviorSubject } from "rxjs";

import { ChainId, getChains } from "src/config/chains";

export type LoadingStatus = "stale" | "loading" | "loaded";

export const initializeChainStatusWatcher = (refreshTimeout: number) => {
  const subject$ = new BehaviorSubject<Record<ChainId, LoadingStatus>>(
    getChains().reduce(
      (acc, chain) => ({ ...acc, [chain.id]: "stale" }),
      {} as Record<ChainId, LoadingStatus>,
    ),
  );

  const getLoadingStatus = (chainId: ChainId) => {
    return subject$.value[chainId];
  };

  const setLoadingStatus = (chainId: ChainId, status: LoadingStatus) => {
    if (subject$.value[chainId] !== status)
      subject$.next({ ...subject$.value, [chainId]: status });
  };

  const staleWatchCache = new Map<ChainId, number>();

  subject$.subscribe((statusByChain) => {
    for (const key in statusByChain) {
      const chainId = key as ChainId;
      switch (statusByChain[chainId]) {
        case "loaded": {
          if (!staleWatchCache.has(chainId)) {
            setTimeout(() => {
              setLoadingStatus(chainId, "stale");
            }, refreshTimeout);
          }
          break;
        }
        default: {
          if (staleWatchCache.has(chainId)) {
            const timeout = staleWatchCache.get(chainId);
            clearTimeout(timeout);
            staleWatchCache.delete(chainId);
          }
          break;
        }
      }
    }
  });

  return {
    getLoadingStatus,
    setLoadingStatus,
    subject$,
  };
};
