import { BehaviorSubject, debounceTime } from "rxjs";

import type { StoredBalance } from "./types";

import { type Dictionary, keyBy, values } from "lodash";
import { DEV_IGNORE_STORAGE } from "src/config/constants";
import { logger, safeParse, safeStringify } from "src/util";
import { getLocalStorageKey } from "src/util/getLocalStorageKey";
import { getBalanceId } from "./utils";

const STORAGE_KEY = getLocalStorageKey("balances::v2");

const load = (): Dictionary<StoredBalance> => {
	try {
		if (DEV_IGNORE_STORAGE) return {};

		const strPools = localStorage.getItem(STORAGE_KEY);
		const pools: StoredBalance[] = strPools ? safeParse(strPools) : [];
		return keyBy(pools, getBalanceId);
	} catch (err) {
		logger.error("Failed to load balances", err);
		return {};
	}
};

const save = (balances: Dictionary<StoredBalance>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(balances)));
	} catch (err) {
		logger.error("Failed to save balances", err);
	}
};

const stop = logger.timer("initialiwing balances store");
export const balancesStore$ = new BehaviorSubject<Dictionary<StoredBalance>>(
	load(),
);
stop();

// save after updates
balancesStore$.pipe(debounceTime(1_000)).subscribe(save);
