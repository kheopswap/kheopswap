import { BehaviorSubject, debounceTime } from "rxjs";

import type { StoredBalance } from "./types";

import { DEV_IGNORE_STORAGE } from "src/config/constants";
import { logger } from "src/util";
import { getLocalStorageKey } from "src/util/getLocalStorageKey";

const load = (): StoredBalance[] => {
	try {
		if (DEV_IGNORE_STORAGE) return [];

		const strPools = localStorage.getItem(getLocalStorageKey("balances"));
		return strPools ? JSON.parse(strPools) : [];
	} catch (err) {
		logger.error("Failed to load balances", err);
		return [];
	}
};

const save = (balances: StoredBalance[]) => {
	try {
		localStorage.setItem(
			getLocalStorageKey("balances"),
			JSON.stringify(balances),
		);
	} catch (err) {
		logger.error("Failed to save balances", err);
	}
};

const stop = logger.timer("initialiwing balances store");
export const balancesStore$ = new BehaviorSubject<StoredBalance[]>(load());
stop();

// save after updates
balancesStore$.pipe(debounceTime(1_000)).subscribe(save);
