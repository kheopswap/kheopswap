import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { BehaviorSubject, debounceTime } from "rxjs";
import type { StoredPoolSupply } from "./types";

const STORAGE_KEY = getLocalStorageKey("poolSupplies");

const load = (): StoredPoolSupply[] => {
	try {
		const strPools = localStorage.getItem(STORAGE_KEY);
		return strPools ? safeParse(strPools) : [];
	} catch (err) {
		logger.error("Failed to load pool supplies", err);
		return [];
	}
};

const save = (poolSupplies: StoredPoolSupply[]) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(poolSupplies));
	} catch (err) {
		logger.error("Failed to save pool supplies", err);
	}
};

const stop = logger.timer("initializing poolSupplies store");

// TODO change to a dictionary for faster lookups and updates
export const poolSuppliesStore$ = new BehaviorSubject<StoredPoolSupply[]>(
	load(),
);

stop();

// save after updates
poolSuppliesStore$.pipe(debounceTime(1_000)).subscribe(save);
