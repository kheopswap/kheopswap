import { logger } from "@kheopswap/utils";
import { fromPairs, keys, uniq } from "lodash-es";
import { combineLatest, map, shareReplay, throttleTime } from "rxjs";
import type { LoadingStatus } from "../common";
import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { BalanceId, BalanceState, StoredBalance } from "./types";
import { balanceStatuses$ } from "./watchers";

const combineState = (
	balanceIds: BalanceId[],
	statuses: Record<string, LoadingStatus>,
	balances: Record<string, StoredBalance>,
): Record<string, BalanceState> => {
	const stop = logger.cumulativeTimer("balances.combineState");

	try {
		const allBalanceIds = uniq(balanceIds.concat(keys(balances)));

		return fromPairs(
			allBalanceIds.map((balanceId) => {
				const status = statuses[balanceId] ?? "stale";
				const balance = balances[balanceId]
					? BigInt(balances[balanceId].balance)
					: undefined;

				return [balanceId, { status, balance }];
			}),
		) as Record<string, BalanceState>;
	} catch (err) {
		logger.error("Failed to merge balances state", { err });
		return {};
	} finally {
		stop();
	}
};

export const balancesState$ = combineLatest([
	balanceSubscriptions$, // unique subscriptions
	balanceStatuses$, // status of each subscription
	balancesStore$, // stored balances
]).pipe(
	throttleTime(100, undefined, { leading: true, trailing: true }),
	map(([balanceIds, statuses, balances]) =>
		combineState(balanceIds, statuses, balances),
	),
	shareReplay(1),
);
