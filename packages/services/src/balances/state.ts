import { combineLatest, map, throttleTime } from "rxjs";

import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { BalanceId, BalanceState, StoredBalance } from "./types";
import { balanceStatuses$ } from "./watchers";

import { logger } from "@kheopswap/utils";
import { type Dictionary, fromPairs, keys } from "lodash";
import type { LoadingStatus } from "../common";

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

export const balancesState$ = combineLatest([
	balanceSubscriptions$, // unique subscriptions
	balanceStatuses$, // status of each subscription
	balancesStore$, // stored balances
]).pipe(
	throttleTime(100, undefined, { leading: true, trailing: true }),
	map(([balanceIds, statuses, balances]) =>
		combineState(balanceIds, statuses, balances),
	),
);
