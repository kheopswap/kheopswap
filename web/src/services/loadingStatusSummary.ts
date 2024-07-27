import { combineLatest, distinctUntilChanged, map } from "rxjs";
import { isEqual, values } from "lodash";

import { balanceStatuses$ } from "./balances/watchers";
import { chainPoolsStatuses$ } from "./pools/watchers";
import { poolSuppliesStatuses$ } from "./poolSupplies/watchers";
import { chainTokensStatuses$ } from "./tokens/watchers";

type LoadingStatusSummary = {
  loading: number;
  loaded: number;
  total: number;
};

export const loadingStatusSummary$ = combineLatest([
  balanceStatuses$,
  chainPoolsStatuses$,
  poolSuppliesStatuses$,
  chainTokensStatuses$,
]).pipe(
  map((statusMaps) => {
    let [loading, loaded] = [0, 0];

    for (const statusMap of statusMaps)
      for (const status of values(statusMap))
        if (status === "loading") loading++;
        else if (status === "loaded") loaded++;

    return { loading, loaded, total: loading + loaded };
  }),
  distinctUntilChanged<LoadingStatusSummary>(isEqual),
);
