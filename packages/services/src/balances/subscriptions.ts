import { type Dictionary, isEqual, uniq, values } from "lodash";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";

import { firstThenDebounceTime } from "@kheopswap/utils";
import type { BalanceId } from "./types";

// represent the list of balances that must be watched
const allBalanceSubscriptions$ = new BehaviorSubject<
	// key = subscripption id
	// value = BalanceId
	Dictionary<string>
>({});

// Unique active subscriptions (1 per token+address)
export const balanceSubscriptions$ = allBalanceSubscriptions$.pipe(
	firstThenDebounceTime(100),
	map((subs) => uniq(values(subs)).sort() as BalanceId[]),
	distinctUntilChanged<BalanceId[]>(isEqual),
);

export const addBalanceSubscription = (balanceId: string) => {
	const subscriptionId = crypto.randomUUID();

	allBalanceSubscriptions$.next(
		Object.assign(allBalanceSubscriptions$.value, {
			[subscriptionId]: balanceId,
		}),
	);

	return subscriptionId;
};

export const removeBalancesSubscription = (id: string) => {
	const current = allBalanceSubscriptions$.value;
	delete current[id];

	allBalanceSubscriptions$.next(current);
};
