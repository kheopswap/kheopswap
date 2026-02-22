import { BehaviorSubject, debounceTime } from "rxjs";
import { DEV_IGNORE_STORAGE } from "../../common/constants";
import { getLocalStorageKey } from "../../utils/getLocalStorageKey";
import { logger } from "../../utils/logger";
import { safeParse, safeStringify } from "../../utils/serialization";
import type { PoolSupplyId, StoredPoolSupply } from "./types";

const STORAGE_KEY = getLocalStorageKey("poolSupplies");

/** Dictionary-backed store: PoolSupplyId → serialized bigint supply */
export type PoolSuppliesStoreData = Record<PoolSupplyId, string>;

const load = (): PoolSuppliesStoreData => {
	try {
		if (DEV_IGNORE_STORAGE) return {};

		const strPools = localStorage.getItem(STORAGE_KEY);
		if (!strPools) return {};

		const parsed: StoredPoolSupply[] | PoolSuppliesStoreData =
			safeParse(strPools);

		// Migrate from legacy array format
		if (Array.isArray(parsed))
			return Object.fromEntries(parsed.map((p) => [p.id, p.supply]));

		return parsed;
	} catch (err) {
		logger.error("Failed to load pool supplies", err);
		return {};
	}
};

const save = (poolSupplies: PoolSuppliesStoreData) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(poolSupplies));
	} catch (err) {
		logger.error("Failed to save pool supplies", err);
	}
};

const stop = logger.timer("initializing poolSupplies store");

export const poolSuppliesStore$ = new BehaviorSubject<PoolSuppliesStoreData>(
	load(),
);

stop();

// save after updates
poolSuppliesStore$.pipe(debounceTime(1_000)).subscribe(save);
