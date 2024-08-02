import { BehaviorSubject, debounceTime } from "rxjs";

import { StoredPoolSupply } from "./types";

import { logger, safeParse, safeStringify } from "src/util";
import { DEV_IGNORE_STORAGE } from "src/config/constants";
import { getLocalStorageKey } from "src/util/getLocalStorageKey";

const load = (): StoredPoolSupply[] => {
	try {
		if (DEV_IGNORE_STORAGE) return [];

		const strPools = localStorage.getItem(getLocalStorageKey("poolSupplies"));
		return strPools ? safeParse(strPools) : [];
	} catch (err) {
		logger.error("Failed to load pool supplies", err);
		return [];
	}
};

const save = (poolSupplies: StoredPoolSupply[]) => {
	try {
		localStorage.setItem(
			getLocalStorageKey("poolSupplies"),
			safeStringify(poolSupplies),
		);
	} catch (err) {
		logger.error("Failed to save pool supplies", err);
	}
};

const stop = logger.timer("initializing poolSupplies store");
export const poolSuppliesStore$ = new BehaviorSubject<StoredPoolSupply[]>(
	load(),
);
stop();

// save after updates
poolSuppliesStore$.pipe(debounceTime(1_000)).subscribe(save);
