import { BehaviorSubject, debounceTime } from "rxjs";
import { DEV_IGNORE_STORAGE } from "../../common/constants";
import type { ChainId } from "../../registry/chains/types";
import { getLocalStorageKey } from "../../utils/getLocalStorageKey";
import { logger } from "../../utils/logger";
import type { Pool, PoolStorage } from "./types";

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("pools"));
localStorage.removeItem(getLocalStorageKey("pools::v2"));

const STORAGE_KEY = getLocalStorageKey("pools::v3");

/** Dictionary-backed store: ChainId → Pool[] */
export type PoolsStoreData = Record<ChainId, Pool[]>;

const poolToStorage = (pool: Pool): PoolStorage => {
	switch (pool.type) {
		case "asset-convertion":
			return {
				...pool,
			};
	}
};

const poolFromStorage = (pool: PoolStorage): Pool => {
	switch (pool.type) {
		case "asset-convertion":
			return {
				...pool,
			};
	}
};

const loadPools = (): PoolsStoreData => {
	try {
		if (DEV_IGNORE_STORAGE) return {} as PoolsStoreData;

		const strPools = localStorage.getItem(STORAGE_KEY);
		if (!strPools) return {} as PoolsStoreData;

		const parsed: PoolStorage[] | PoolsStoreData = JSON.parse(strPools);

		// Migrate from legacy array format
		if (Array.isArray(parsed)) {
			const pools = parsed.filter((p) => !!p.owner).map(poolFromStorage);
			const result: PoolsStoreData = {} as PoolsStoreData;
			for (const pool of pools) {
				if (!result[pool.chainId]) result[pool.chainId] = [];
				result[pool.chainId].push(pool);
			}
			return result;
		}

		// Dictionary format: validate pools have owner
		const result: PoolsStoreData = {} as PoolsStoreData;
		for (const [chainId, pools] of Object.entries(parsed)) {
			result[chainId as ChainId] = (pools as PoolStorage[])
				.filter((p) => !!p.owner)
				.map(poolFromStorage);
		}
		return result;
	} catch (err) {
		console.error("Failed to load pools", err);
		return {} as PoolsStoreData;
	}
};

const savePools = (poolsByChain: PoolsStoreData) => {
	try {
		const storageData: Record<string, PoolStorage[]> = {};
		for (const [chainId, pools] of Object.entries(poolsByChain)) {
			storageData[chainId] = pools.map(poolToStorage);
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
	} catch (err) {
		console.error("Failed to save pools", err);
	}
};

const stop = logger.timer("initializing pools store");

export const poolsStore$ = new BehaviorSubject<PoolsStoreData>(loadPools());

stop();

// save after updates
poolsStore$.pipe(debounceTime(1_000)).subscribe(savePools);
