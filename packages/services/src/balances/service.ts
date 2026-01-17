import { getCachedObservable$ } from "@kheopswap/utils";
import isEqual from "lodash/isEqual";
import {
	combineLatest,
	distinctUntilChanged,
	map,
	Observable,
	shareReplay,
} from "rxjs";
import { balancesState$ } from "./state";
import {
	addBalanceSubscription,
	removeBalancesSubscription,
} from "./subscriptions";
import type { BalanceDef, BalanceState } from "./types";
import { getBalanceId } from "./utils";

const DEFAULT_BALANCE_STATE: BalanceState = {
	balance: undefined,
	status: "stale",
};

export const getBalance$ = (def: BalanceDef) => {
	const balanceId = getBalanceId(def);

	return getCachedObservable$("getBalance$", balanceId, () => {
		return new Observable<BalanceState>((subscriber) => {
			const subId = addBalanceSubscription(balanceId);

			const sub = balancesState$
				.pipe(
					map((balances) => balances[balanceId] ?? DEFAULT_BALANCE_STATE),
					distinctUntilChanged(isEqual),
				)
				.subscribe(subscriber);

			return () => {
				sub.unsubscribe();
				removeBalancesSubscription(subId);
			};
		}).pipe(shareReplay({ refCount: true, bufferSize: 1 }));
	});
};

export const getBalances$ = (defs: BalanceDef[]) => {
	return getCachedObservable$(
		"getBalances$",
		defs.map(getBalanceId).join(","),
		() =>
			combineLatest(defs.map(getBalance$)).pipe(
				shareReplay({ refCount: true, bufferSize: 1 }),
			),
	);
};
