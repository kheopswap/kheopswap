import { BehaviorSubject, combineLatest, debounceTime, map } from "rxjs";

import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import { BalanceId, BalanceState, StoredBalance } from "./types";
import { getBalanceId } from "./utils";
import { balanceStatuses$ } from "./watchers";

import { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

const combineState = (
	balanceIds: BalanceId[],
	statuses: Record<BalanceId, LoadingStatus>,
	balances: StoredBalance[],
): Record<BalanceId, BalanceState> => {
	try {
		const balancesByBalanceId = new Map<BalanceId, string>(
			balances.map((b) => [getBalanceId(b), b.balance] as const),
		);

		const allBalanceIds = [
			...new Set<BalanceId>(balanceIds.concat([...balancesByBalanceId.keys()])),
		];

		return Object.fromEntries(
			allBalanceIds.map((balanceId) => {
				const status = statuses[balanceId] ?? "stale";
				const balance = balancesByBalanceId.has(balanceId)
					? BigInt(balancesByBalanceId.get(balanceId) as string)
					: undefined;

				return [balanceId, { status, balance }];
			}),
		) as Record<BalanceId, BalanceState>;
	} catch (err) {
		logger.error("Failed to merge balances state", { err });
		return {};
	}
};

// contains all known balances and their status
export const balancesState$ = new BehaviorSubject<
	Record<BalanceId, BalanceState>
>(combineState([], balanceStatuses$.value, balancesStore$.value));

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
