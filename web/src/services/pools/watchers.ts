import { isEqual } from "lodash";
import { distinctUntilChanged, map } from "rxjs";

import { AssetConvertionPoolDef } from "./types";
import { poolsStore$ } from "./store";
import { poolsByChainSubscriptions$ } from "./subscriptions";

import { initializeChainStatusWatcher } from "src/services/common";
import {
  POOLS_CACHE_DURATION,
  STORAGE_QUERY_TIMEOUT,
} from "src/config/constants";
import { Chain, ChainId, getChainById, isAssetHub } from "src/config/chains";
import { getApi } from "src/services/api";
import { getTokenIdFromXcmV3Multilocation, logger, throwAfter } from "src/util";
import { TokenIdsPair } from "src/config/tokens";
import { sleep } from "src/util/sleep";

export const chainPoolsLoadingStatuses =
  initializeChainStatusWatcher(POOLS_CACHE_DURATION);

const WATCHERS = new Map<ChainId, () => void>();

const fetchAssetConvertionPools = async (chain: Chain, signal: AbortSignal) => {
  if (isAssetHub(chain)) {
    const api = await getApi(chain.id);
    if (signal.aborted) return;

    await api.waitReady;
    if (signal.aborted) return;

    const stopWatch = logger.timer(`fetch pools & metadata - ${chain.id}`);
    const [rawPools, rawPoolAssets] = await Promise.all([
      api.query.AssetConversion.Pools.getEntries({ at: "best", signal }),
      api.query.PoolAssets.Asset.getEntries({ at: "best", signal }),
    ]);
    stopWatch();

    const pools = rawPools
      .map<AssetConvertionPoolDef | null>((d) => {
        const assetPoolId = d.value;
        const poolAsset = rawPoolAssets.find(
          (p) => p.keyArgs[0] === assetPoolId,
        );
        if (!poolAsset) return null;

        const pool: AssetConvertionPoolDef = {
          type: "asset-convertion",
          chainId: chain.id,
          assetPoolId,
          tokenIds: d.keyArgs[0].map(
            (k) => getTokenIdFromXcmV3Multilocation(chain.id, k)!,
          ) as TokenIdsPair,
          owner: poolAsset.value.owner,
        };
        return pool;
      })
      .filter((p): p is AssetConvertionPoolDef => !!p)
      .filter((p): p is AssetConvertionPoolDef => p.tokenIds.every((t) => !!t));

    const currentPools = poolsStore$.value;

    const otherPools = currentPools.filter((t) => t.chainId !== chain.id);

    const newValue = [...otherPools, ...pools];

    if (!isEqual(currentPools, newValue)) poolsStore$.next(newValue);
  }
};

const watchPoolsByChain = (chainId: ChainId) => {
  const controller = new AbortController();
  // let stop = false;
  let retryTimeout = 3_000;

  const refresh = async () => {
    const controller2 = new AbortController();
    const abort2 = () => controller2.abort();
    controller.signal.addEventListener("abort", abort2);

    try {
      if (controller.signal.aborted) return;

      chainPoolsLoadingStatuses.setLoadingStatus(chainId, "loading");

      const chain = getChainById(chainId);
      if (!chain) throw new Error(`Could not find chain ${chainId}`);

      await Promise.race([
        Promise.all([
          fetchAssetConvertionPools(chain, controller2.signal),
          // more pool types to fetch here
        ]),
        throwAfter(STORAGE_QUERY_TIMEOUT, "Failed to fetch tokens (timeout)"),
      ]);

      if (!controller.signal.aborted)
        chainPoolsLoadingStatuses.setLoadingStatus(chainId, "loaded");
    } catch (err) {
      controller2.abort();
      console.error("Failed to fetch tokens", { chainId, err });
      // wait before retrying to prevent browser from hanging
      await sleep(retryTimeout);
      retryTimeout *= 2; // increase backoff duration
      chainPoolsLoadingStatuses.setLoadingStatus(chainId, "stale");
    }

    controller.signal.removeEventListener("abort", abort2);
  };

  const sub = chainPoolsLoadingStatuses.subject$
    .pipe(
      map((statusByChain) => statusByChain[chainId]),
      distinctUntilChanged(),
    )
    .subscribe((status) => {
      if (status === "stale") refresh();
    });

  return () => {
    controller.abort();
    sub.unsubscribe();
  };
};

poolsByChainSubscriptions$.subscribe((chainIds) => {
  // add missing watchers
  for (const chainId of chainIds.filter((id) => !WATCHERS.has(id)))
    WATCHERS.set(chainId, watchPoolsByChain(chainId));

  // remove watchers that are not needed anymore
  const existingIds = Array.from(WATCHERS.keys());
  const watchersToStop = existingIds.filter((id) => !chainIds.includes(id));
  for (const chainId of watchersToStop) {
    WATCHERS.get(chainId)?.();
    WATCHERS.delete(chainId);
    chainPoolsLoadingStatuses.setLoadingStatus(chainId, "stale");
  }
});

export const getPoolsWatchersCount = () => WATCHERS.size;
