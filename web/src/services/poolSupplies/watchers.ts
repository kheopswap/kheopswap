import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  Subscription,
} from "rxjs";
import { isEqual } from "lodash";

import { poolSuppliesStore$ } from "./store";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import { PoolSupplyId } from "./types";
import { parsePoolSupplyId } from "./utils";

import { getChainById, isAssetHub } from "src/config/chains";
import { parseTokenId } from "src/config/tokens";
import { getApi } from "src/services/api";
import { LoadingStatus } from "src/services/common";
import {
  getPoolsByChain$,
  Pool,
  subscribePoolsByChain,
} from "src/services/pools";

export const poolSuppliesStatuses$ = new BehaviorSubject<
  Record<PoolSupplyId, LoadingStatus>
>({});

const WATCHERS = new Map<PoolSupplyId, Promise<Subscription>>();

const updateBalanceLoadingStatus = (
  poolSupplyId: PoolSupplyId,
  status: LoadingStatus,
) => {
  if (poolSuppliesStatuses$.value[poolSupplyId] === status) return;

  poolSuppliesStatuses$.next({
    ...poolSuppliesStatuses$.value,
    [poolSupplyId]: status,
  });
};

const updatePoolSupply = (poolSupplyId: PoolSupplyId, supply: bigint) => {
  const newBalances = poolSuppliesStore$.value
    .filter((p) => p.id !== poolSupplyId)
    .concat({ id: poolSupplyId, supply: supply.toString() });

  // update balances store
  poolSuppliesStore$.next(newBalances);

  // indicate it's loaded
  updateBalanceLoadingStatus(poolSupplyId, "loaded");
};

const watchPoolSupply = async (poolSupplyId: PoolSupplyId) => {
  const [tokenId1, tokenId2] = parsePoolSupplyId(poolSupplyId);
  const token1 = parseTokenId(tokenId1);

  const chain = getChainById(token1.chainId);
  if (!chain) throw new Error("Chain not found for " + token1.chainId);

  if (!isAssetHub(chain))
    throw new Error("Can't watch pool supply on this chain");

  const api = await getApi(chain.id);

  updateBalanceLoadingStatus(poolSupplyId, "loading");

  const unsubscribeChainPools = subscribePoolsByChain(chain.id);

  const chainPool$ = getPoolsByChain$(chain.id).pipe(
    map((chainPools) =>
      chainPools.pools.find(
        (p) =>
          p.tokenIds.includes(tokenId1) &&
          p.tokenIds.includes(tokenId2) &&
          p.tokenIds.length === 2,
      ),
    ),
    filter((pool) => !!pool),
    distinctUntilChanged<Pool>(isEqual),
    mergeMap((pool) =>
      api.query.PoolAssets.Asset.watchValue(pool.assetPoolId, "best"),
    ),
  );

  const supplySub = chainPool$.subscribe((assetPool) => {
    const supply = assetPool?.supply || 0n;
    updatePoolSupply(poolSupplyId, supply);
  });

  return new Subscription(() => {
    supplySub.unsubscribe();
    unsubscribeChainPools();
    updateBalanceLoadingStatus(poolSupplyId, "stale");
  });
};

// subscribe to the list of the unique PoolSupplyIds to watch
// and update watchers accordingly
poolSuppliesSubscriptions$.subscribe((poolSupplyIds) => {
  // add missing watchers
  poolSupplyIds.forEach((poolSupplyId) => {
    if (WATCHERS.has(poolSupplyId)) return;
    WATCHERS.set(poolSupplyId, watchPoolSupply(poolSupplyId));
  });

  // remove watchers that are not needed anymore
  const existingIds = Array.from(WATCHERS.keys());
  const watchersToStop = existingIds.filter(
    (id) => !poolSupplyIds.includes(id),
  );
  for (const poolSupplyId of watchersToStop) {
    WATCHERS.get(poolSupplyId)?.then((watcher) => watcher.unsubscribe());
    WATCHERS.delete(poolSupplyId);
  }
  poolSuppliesStatuses$.next({
    ...poolSuppliesStatuses$.value,
    ...watchersToStop.reduce((acc, id) => ({ ...acc, [id]: "stale" }), {}),
  });
});

export const getPoolSuppliesWatchersCount = () => WATCHERS.size;
