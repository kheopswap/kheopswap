import { isEqual } from "lodash";
import { BehaviorSubject, debounceTime, distinctUntilChanged, map } from "rxjs";

import type { PoolSupplyId } from "./types";
import { getPoolSupplyId } from "./utils";

import type { TokenIdsPair } from "src/config/tokens";

type PoolSupplySubscriptionRequest = {
	id: string;
	poolSupplyIds: PoolSupplyId[];
};

// represent the list of balances that must be watched
const allPoolSupplySubscriptions$ = new BehaviorSubject<
	PoolSupplySubscriptionRequest[]
>([]);

// Unique active subscriptions (1 per token+address)
export const poolSuppliesSubscriptions$ = allPoolSupplySubscriptions$.pipe(
	debounceTime(50),
	map((subs) => subs.flatMap(({ poolSupplyIds }) => poolSupplyIds)),
	map((pollSupplyIds) => [...new Set(pollSupplyIds)].sort() as PoolSupplyId[]),
	distinctUntilChanged<PoolSupplyId[]>(isEqual),
);

export const addPoolSupplySubscription = (pairs: TokenIdsPair[]) => {
	const request: PoolSupplySubscriptionRequest = {
		id: crypto.randomUUID(),
		poolSupplyIds: pairs.map(getPoolSupplyId),
	};

	allPoolSupplySubscriptions$.next([
		...allPoolSupplySubscriptions$.value,
		request,
	]);

	return request.id;
};

export const removePoolSupplySubscription = (id: string) => {
	allPoolSupplySubscriptions$.next(
		allPoolSupplySubscriptions$.value.filter((sub) => sub.id !== id),
	);
};
