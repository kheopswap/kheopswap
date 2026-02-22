import { isEqual } from "lodash-es";
import {
	BehaviorSubject,
	distinctUntilChanged,
	filter,
	map,
	mergeMap,
	Subscription,
} from "rxjs";
import { getApi } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { LoadingStatus } from "../common";
import { getPoolsByChain$ } from "../pools/service";
import type { Pool } from "../pools/types";
import { poolSuppliesStore$ } from "./store";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import type { PoolSupplyId } from "./types";
import { parsePoolSupplyId } from "./utils";

const statusByPoolSupplyId$ = new BehaviorSubject<
	Record<PoolSupplyId, LoadingStatus>
>({});

const WATCHERS = new Map<PoolSupplyId, Promise<Subscription>>();

const updatePoolSupplyLoadingStatus = (
	poolSupplyId: PoolSupplyId,
	status: LoadingStatus,
) => {
	if (statusByPoolSupplyId$.value[poolSupplyId] === status) return;

	statusByPoolSupplyId$.next({
		...statusByPoolSupplyId$.value,
		[poolSupplyId]: status,
	});
};

const updatePoolSupply = (poolSupplyId: PoolSupplyId, supply: bigint) => {
	const supplyStr = supply.toString();

	if (poolSuppliesStore$.value[poolSupplyId] !== supplyStr) {
		poolSuppliesStore$.next({
			...poolSuppliesStore$.value,
			[poolSupplyId]: supplyStr,
		});
	}

	// indicate it's loaded
	updatePoolSupplyLoadingStatus(poolSupplyId, "loaded");
};

const watchPoolSupply = async (poolSupplyId: PoolSupplyId) => {
	const [tokenId1, tokenId2] = parsePoolSupplyId(poolSupplyId);
	const token1 = parseTokenId(tokenId1);

	const chain = getChainById(token1.chainId);
	if (!chain) throw new Error(`Chain not found for ${token1.chainId}`);

	const api = await getApi(chain.id);

	updatePoolSupplyLoadingStatus(poolSupplyId, "loading");

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
			api.query.PoolAssets.Asset.watchValue(pool.poolAssetId, { at: "best" }),
		),
	);

	const supplySub = chainPool$.subscribe(({ value: assetPool }) => {
		const supply = assetPool?.supply || 0n;
		updatePoolSupply(poolSupplyId, supply);
	});

	return new Subscription(() => {
		supplySub.unsubscribe();
		updatePoolSupplyLoadingStatus(poolSupplyId, "stale");
	});
};

// subscribe to the list of the unique PoolSupplyIds to watch
// and update watchers accordingly
poolSuppliesSubscriptions$.subscribe((poolSupplyIds) => {
	// add missing watchers
	for (const poolSupplyId of poolSupplyIds) {
		if (WATCHERS.has(poolSupplyId)) continue;
		WATCHERS.set(poolSupplyId, watchPoolSupply(poolSupplyId));
	}

	// remove watchers that are not needed anymore
	const existingIds = Array.from(WATCHERS.keys());
	const watchersToStop = existingIds.filter(
		(id) => !poolSupplyIds.includes(id),
	);
	for (const poolSupplyId of watchersToStop) {
		WATCHERS.get(poolSupplyId)?.then((watcher) => watcher.unsubscribe());
		WATCHERS.delete(poolSupplyId);
	}
	statusByPoolSupplyId$.next({
		...statusByPoolSupplyId$.value,
		...Object.fromEntries(watchersToStop.map((id) => [id, "stale"])),
	});
});

export const poolSuppliesStatuses$ = statusByPoolSupplyId$.asObservable();

export const getPoolSuppliesWatchersCount = () => WATCHERS.size;
