import { BehaviorSubject, debounceTime } from "rxjs";

import type { Pool, PoolStorage } from "./types";

import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import { logger } from "@kheopswap/utils";
import { getLocalStorageKey } from "@kheopswap/utils";

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("pools"));

const STORAGE_KEY = getLocalStorageKey("pools::v2");

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

const loadPools = (): Pool[] => {
	try {
		if (DEV_IGNORE_STORAGE) return [];

		const strPools = localStorage.getItem(STORAGE_KEY);
		if (!strPools) return [];

		const storagePools = JSON.parse(strPools) as PoolStorage[];
		// ensure there is an owner (added that property with liquidity PR)
		return storagePools.filter((p) => !!p.owner).map(poolFromStorage);
	} catch (err) {
		console.error("Failed to load pools", err);
		return [];
	}
};

const savePools = (pools: Pool[]) => {
	try {
		const storagePools = pools.map(poolToStorage);
		const strPools = JSON.stringify(storagePools);

		localStorage.setItem(STORAGE_KEY, strPools);
	} catch (err) {
		console.error("Failed to save pools", err);
	}
};

const stop = logger.timer("initializing pools store");
export const poolsStore$ = new BehaviorSubject<Pool[]>(loadPools());
stop();

// save after updates
poolsStore$.pipe(debounceTime(1_000)).subscribe(savePools);
