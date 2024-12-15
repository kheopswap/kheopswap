import isEqual from "lodash/isEqual";
import {
	Observable,
	combineLatest,
	distinctUntilChanged,
	map,
	of,
	shareReplay,
} from "rxjs";

import { isAccountCompatibleWithToken } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
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

const INVALID_BALANCE_STATE: BalanceState = {
	balance: 0n,
	status: "loaded",
};

export const getBalance$ = (def: BalanceDef) => {
	if (!isAccountCompatibleWithToken(def.address, def.tokenId))
		return of(INVALID_BALANCE_STATE);

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
