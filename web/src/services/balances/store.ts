import { BehaviorSubject, debounceTime } from "rxjs";

import { StoredBalance } from "./types";

import { getLocalStorageKey, logger } from "src/util";

const load = (): StoredBalance[] => {
  try {
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

export const balancesStore$ = new BehaviorSubject<StoredBalance[]>(load());

// save after updates
balancesStore$.pipe(debounceTime(1_000)).subscribe(save);
