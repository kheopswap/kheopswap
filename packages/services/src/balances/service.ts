import { getCachedObservable$ } from "@kheopswap/utils";
import { isEqual } from "lodash-es";
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
import type {
	BalanceDef,
	BalanceState,
	BalanceSubscriptionMode,
} from "./types";
import { getBalanceId } from "./utils";

const DEFAULT_BALANCE_STATE: BalanceState = {
	balance: undefined,
	status: "stale",
};

export const getBalance$ = (def: BalanceDef) => {
	const balanceId = getBalanceId(def);
	const mode: BalanceSubscriptionMode = def.mode ?? "live";

	// Cache key includes mode so different mode subscriptions are separate observables
	// but they share the same underlying balance state
	const cacheKey = `${balanceId}::${mode}`;

	return getCachedObservable$("getBalance$", cacheKey, () => {
		return new Observable<BalanceState>((subscriber) => {
			const subId = addBalanceSubscription(balanceId, mode);

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
	// Include mode in cache key
	const cacheKey = defs
		.map((d) => `${getBalanceId(d)}::${d.mode ?? "live"}`)
		.join(",");

	return getCachedObservable$("getBalances$", cacheKey, () =>
		combineLatest(defs.map(getBalance$)).pipe(
			shareReplay({ refCount: true, bufferSize: 1 }),
		),
	);
};
