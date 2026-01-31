import { Subject } from "rxjs";
import type { BalanceId } from "./types";

/**
 * Subject that emits when balances should be refreshed.
 * - `undefined`: refresh all poll-mode balances
 * - `string[]`: refresh only the specified balance IDs
 */
export const balanceRefreshTrigger$ = new Subject<undefined | BalanceId[]>();

/**
 * Force refresh balance subscriptions (primarily for poll-mode).
 * Call this after transactions complete to immediately update balances.
 *
 * @param balanceIds - Optional list of specific balance IDs to refresh.
 *                     If omitted, all poll-mode balances will be refreshed.
 */
export const refreshBalances = (balanceIds?: BalanceId[]): void => {
	balanceRefreshTrigger$.next(balanceIds);
};
