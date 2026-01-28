import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { keyBy, values } from "lodash-es";
import { BehaviorSubject, debounceTime } from "rxjs";
import type { StoredBalance } from "./types";
import { getBalanceId } from "./utils";

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("balances"));
localStorage.removeItem(getLocalStorageKey("balances::v2"));

const STORAGE_KEY = getLocalStorageKey("balances::v3");

const load = (): Record<string, StoredBalance> => {
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

const save = (balances: Record<string, StoredBalance>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(balances)));
	} catch (err) {
		logger.error("Failed to save balances", err);
	}
};

const stop = logger.timer("initialiwing balances store");
export const balancesStore$ = new BehaviorSubject<
	Record<string, StoredBalance>
>(load());
stop();

// save after updates
balancesStore$.pipe(debounceTime(1_000)).subscribe(save);
