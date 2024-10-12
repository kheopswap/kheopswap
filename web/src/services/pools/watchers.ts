import { isEqual } from "lodash";
import { distinctUntilChanged, filter } from "rxjs";

import { poolsStore$ } from "./store";
import { poolsByChainSubscriptions$ } from "./subscriptions";
import type { AssetConvertionPoolDef } from "./types";

import {
	POOLS_CACHE_DURATION,
	STORAGE_QUERY_TIMEOUT,
} from "@kheopswap/constants";
import { getApi } from "@kheopswap/papi";
import {
	type Chain,
	type ChainId,
	getChainById,
	isAssetHub,
} from "@kheopswap/registry";
import type { TokenIdsPair } from "@kheopswap/registry";
import { logger, sleep, throwAfter } from "@kheopswap/utils";
import { pollChainStatus } from "src/services/pollChainStatus";
import { getTokenIdFromXcmV3Multilocation } from "src/util";

export const { getLoadingStatus$, loadingStatusByChain$, setLoadingStatus } =
	pollChainStatus("poolsByChainStatuses", POOLS_CACHE_DURATION);

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
				const poolAssetId = d.value;
				const poolAsset = rawPoolAssets.find(
					(p) => p.keyArgs[0] === poolAssetId,
				);

				if (!poolAsset) return null;

				const pool: AssetConvertionPoolDef = {
					type: "asset-convertion",
					chainId: chain.id,
					poolAssetId,
					tokenIds: d.keyArgs[0].map((k) =>
						getTokenIdFromXcmV3Multilocation(chain.id, k),
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
	const watchController = new AbortController();
	// let stop = false;
	let retryTimeout = 3_000;

	const refresh = async () => {
		if (watchController.signal.aborted) return;

		const refreshController = new AbortController();
		const cancelRefresh = () => refreshController.abort();
		watchController.signal.addEventListener("abort", cancelRefresh);

		try {
			setLoadingStatus(chainId, "loading");

			const chain = getChainById(chainId);
			if (!chain) throw new Error(`Could not find chain ${chainId}`);

			await Promise.race([
				Promise.all([
					fetchAssetConvertionPools(chain, refreshController.signal),
					// more pool types to fetch here
				]),
				throwAfter(STORAGE_QUERY_TIMEOUT, "Failed to fetch tokens (timeout)"),
			]);

			if (!watchController.signal.aborted) setLoadingStatus(chainId, "loaded");
		} catch (err) {
			refreshController.abort();
			console.error("Failed to fetch tokens", { chainId, err });
			// wait before retrying to prevent browser from hanging
			await sleep(retryTimeout);
			retryTimeout *= 2; // increase backoff duration
			setLoadingStatus(chainId, "stale");
		}

		watchController.signal.removeEventListener("abort", cancelRefresh);
	};

	const sub = getLoadingStatus$(chainId)
		.pipe(
			distinctUntilChanged(),
			filter((status) => status === "stale"),
		)
		.subscribe(() => {
			refresh();
		});

	return () => {
		sub.unsubscribe();
		watchController.abort();
	};
};

poolsByChainSubscriptions$.subscribe((chainIds) => {
	// remove watchers that are not needed anymore
	const existingIds = Array.from(WATCHERS.keys());
	const watchersToStop = existingIds.filter((id) => !chainIds.includes(id));

	for (const chainId of watchersToStop) {
		WATCHERS.get(chainId)?.();
		WATCHERS.delete(chainId);
	}
	setLoadingStatus(watchersToStop, "stale");

	// add missing watchers
	for (const chainId of chainIds.filter((id) => !WATCHERS.has(id)))
		WATCHERS.set(chainId, watchPoolsByChain(chainId));
});

export const chainPoolsStatuses$ = loadingStatusByChain$.asObservable();

export const getPoolsWatchersCount = () => WATCHERS.size;
