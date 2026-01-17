import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { type Dictionary, keyBy, pickBy, values } from "lodash";
import { BehaviorSubject, debounceTime } from "rxjs";
import type { BalanceId, StoredBalance } from "./types";
import { getBalanceId } from "./utils";

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("balances"));

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

/**
 * Remove balance entries that are no longer being watched.
 * Called when watchers are removed to prevent unbounded store growth.
 */
export const cleanupBalancesStore = (activeBalanceIds: Set<BalanceId>) => {
	const current = balancesStore$.value;
	const cleaned = pickBy(current, (_, id) =>
		activeBalanceIds.has(id as BalanceId),
	);

	if (Object.keys(cleaned).length < Object.keys(current).length) {
		balancesStore$.next(cleaned);
	}
};
