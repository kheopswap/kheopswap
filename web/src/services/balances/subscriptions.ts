import { isEqual } from "lodash";
import { BehaviorSubject, distinctUntilChanged, map, throttleTime } from "rxjs";

import type { BalanceDef, BalanceId } from "./types";
import { getBalanceId } from "./utils";

type BalanceSubscriptionRequest = {
	id: string;
	balanceIds: BalanceId[];
};

// represent the list of balances that must be watched
const allBalanceSubscriptions$ = new BehaviorSubject<
	BalanceSubscriptionRequest[]
>([]);

// Unique active subscriptions (1 per token+address)
export const balanceSubscriptions$ = allBalanceSubscriptions$.pipe(
	throttleTime(200, undefined, { leading: true, trailing: true }),
	map((subs) => subs.flatMap(({ balanceIds }) => balanceIds)),
	map((balanceIds) => [...new Set(balanceIds)].sort() as BalanceId[]),
	distinctUntilChanged<BalanceId[]>(isEqual),
);

export const addBalancesSubscription = (requests: BalanceDef[]) => {
	const request: BalanceSubscriptionRequest = {
		id: crypto.randomUUID(),
		balanceIds: requests.map(getBalanceId),
	};

	allBalanceSubscriptions$.next([...allBalanceSubscriptions$.value, request]);

	return request.id;
};

export const removeBalancesSubscription = (id: string) => {
	allBalanceSubscriptions$.next(
		allBalanceSubscriptions$.value.filter((sub) => sub.id !== id),
	);
};
