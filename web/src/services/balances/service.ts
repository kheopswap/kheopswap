import isEqual from "lodash/isEqual";
import { distinctUntilChanged, map } from "rxjs";

import {
  addBalancesSubscription,
  removeBalancesSubscription,
} from "./subscriptions";
import { Balance, BalanceDef, BalanceState } from "./types";
import { getBalanceId } from "./utils";
import { balancesState$ } from "./state";

const DEFAULT_BALANCE_STATE: BalanceState = {
  balance: undefined,
  status: "stale",
};

export const subscribeBalances = (balanceDefs: BalanceDef[]) => {
  const subId = addBalancesSubscription(balanceDefs);

  return () => {
    removeBalancesSubscription(subId);
  };
};

export const getBalance$ = (def: BalanceDef) => {
  const balanceId = getBalanceId(def);
  return balancesState$.pipe(
    map(
      (balances): Balance => ({
        ...def,
        ...(balances[balanceId] ?? DEFAULT_BALANCE_STATE),
      }),
    ),
    distinctUntilChanged<Balance>(isEqual),
  );
};

export const getBalances$ = (defs: BalanceDef[]) => {
  const balanceIds = defs.map(getBalanceId);
  return balancesState$.pipe(
    map((balances) =>
      balanceIds.map(
        (id, idx): Balance => ({
          ...defs[idx],
          ...(balances[id] ?? DEFAULT_BALANCE_STATE),
        }),
      ),
    ),
    distinctUntilChanged<Balance[]>(isEqual),
  );
};
