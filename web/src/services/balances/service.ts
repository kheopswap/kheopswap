import isEqual from "lodash/isEqual";
import { distinctUntilChanged, map, tap } from "rxjs";

import { balancesState$ } from "./state";
import {
	addBalancesSubscription,
	removeBalancesSubscription,
} from "./subscriptions";
import type { Balance, BalanceDef, BalanceState } from "./types";
import { getBalanceId } from "./utils";

const DEFAULT_BALANCE_STATE: BalanceState = {
	balance: undefined,
	status: "stale",
};

export const getBalances$ = (defs: BalanceDef[]) => {
	const balanceIds = defs.map(getBalanceId);

	let subId = "";

	return balancesState$.pipe(
		tap({
			subscribe: () => {
				if (defs.length) subId = addBalancesSubscription(defs);
			},
			unsubscribe: () => {
				if (defs.length) removeBalancesSubscription(subId);
			},
		}),
		map((balances) =>
			balanceIds.map(
				(id, idx): Balance => ({
					...(defs[idx] as BalanceDef),
					...(balances[id] ?? DEFAULT_BALANCE_STATE),
				}),
			),
		),
		distinctUntilChanged<Balance[]>(isEqual),
	);
};
