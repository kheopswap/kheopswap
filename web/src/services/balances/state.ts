import { BehaviorSubject, combineLatest, debounceTime, map } from "rxjs";

import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { BalanceId, BalanceState, StoredBalance } from "./types";
import { balanceStatuses$ } from "./watchers";

import { type Dictionary, fromPairs, keys } from "lodash";
import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

const combineState = (
	balanceIds: BalanceId[],
	statuses: Dictionary<LoadingStatus>,
	balances: Dictionary<StoredBalance>,
): Dictionary<BalanceState> => {
	try {
		const allBalanceIds = [
			...new Set<BalanceId>(balanceIds.concat(keys(balances))),
		];

		return fromPairs(
			allBalanceIds.map((balanceId) => {
				const status = statuses[balanceId] ?? "stale";
				const balance = balances[balanceId]
					? BigInt(balances[balanceId].balance)
					: undefined;

				return [balanceId, { status, balance }];
			}),
		) as Dictionary<BalanceState>;
	} catch (err) {
		logger.error("Failed to merge balances state", { err });
		return {};
	}
};

// contains all known balances and their status
export const balancesState$ = new BehaviorSubject<Dictionary<BalanceState>>(
	combineState([], balanceStatuses$.value, balancesStore$.value),
);

// maintain the above up to date
combineLatest([
	balanceSubscriptions$, // unique subscriptions
	balanceStatuses$, // status of each subscription
	balancesStore$, // stored balances
])
	.pipe(
		debounceTime(50),
		map(([balanceIds, statuses, balances]) =>
			combineState(balanceIds, statuses, balances),
		),
	)
	.subscribe((balances) => {
		balancesState$.next(balances);
	});
