import { isEqual } from "lodash-es";
import { distinctUntilChanged, map, Subject, startWith } from "rxjs";
import { firstThenDebounceTime } from "../../utils/firstThenDebounceTime";
import type { BalanceId } from "./types";

const subscribersByBalanceId = new Map<BalanceId, number>();
const changed$ = new Subject<void>();

export const balanceSubscriptions$ = changed$.pipe(
	startWith(undefined),
	firstThenDebounceTime(100),
	map(() => [...subscribersByBalanceId.keys()].sort()),
	distinctUntilChanged<BalanceId[]>(isEqual),
);

export const addBalanceSubscription = (balanceId: BalanceId) => {
	subscribersByBalanceId.set(
		balanceId,
		(subscribersByBalanceId.get(balanceId) ?? 0) + 1,
	);
	changed$.next();

	return () => {
		const remaining = (subscribersByBalanceId.get(balanceId) ?? 1) - 1;
		if (remaining) subscribersByBalanceId.set(balanceId, remaining);
		else subscribersByBalanceId.delete(balanceId);
		changed$.next();
	};
};
