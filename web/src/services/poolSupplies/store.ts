import { BehaviorSubject, debounceTime } from "rxjs";

import { StoredPoolSupply } from "./types";

import { getLocalStorageKey, logger } from "src/util";

const load = (): StoredPoolSupply[] => {
  try {
    const strPools = localStorage.getItem(getLocalStorageKey("poolSupplies"));
    return strPools ? JSON.parse(strPools) : [];
  } catch (err) {
    logger.error("Failed to load pool supplies", err);
    return [];
  }
};

const save = (poolSupplies: StoredPoolSupply[]) => {
  try {
    localStorage.setItem(
      getLocalStorageKey("poolSupplies"),
      JSON.stringify(poolSupplies),
    );
  } catch (err) {
    logger.error("Failed to save pool supplies", err);
  }
};

export const poolSuppliesStore$ = new BehaviorSubject<StoredPoolSupply[]>(
  load(),
);

// save after updates
poolSuppliesStore$.pipe(debounceTime(1_000)).subscribe(save);
