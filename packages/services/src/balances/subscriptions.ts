import { firstThenDebounceTime } from "@kheopswap/utils";
import { isEqual, uniq, values } from "lodash-es";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";
import type { BalanceId, BalanceSubscriptionMode } from "./types";

type SubscriptionEntry = {
	balanceId: BalanceId;
	mode: BalanceSubscriptionMode;
};

// represent the list of balances that must be watched
const allBalanceSubscriptions$ = new BehaviorSubject<
	// key = subscription id
	// value = { balanceId, mode }
	Record<string, SubscriptionEntry>
>({});

// Unique active subscriptions (1 per token+address)
export const balanceSubscriptions$ = allBalanceSubscriptions$.pipe(
	firstThenDebounceTime(100),
	map(
		(subs) => uniq(values(subs).map((s) => s.balanceId)).sort() as BalanceId[],
	),
	distinctUntilChanged<BalanceId[]>(isEqual),
);

/**
 * Get the effective mode for a balance ID.
 * If any subscriber requests "live", the effective mode is "live".
 * Otherwise, it's "poll".
 */
export const getEffectiveMode = (
	balanceId: BalanceId,
): BalanceSubscriptionMode => {
	const subs = values(allBalanceSubscriptions$.value);
	const hasLive = subs.some(
		(s) => s.balanceId === balanceId && s.mode === "live",
	);
	return hasLive ? "live" : "poll";
};

/**
 * Observable that emits whenever the effective modes change.
 * Returns a map of balanceId -> effective mode.
 */
export const effectiveModes$ = allBalanceSubscriptions$.pipe(
	firstThenDebounceTime(100),
	map((subs) => {
		const modes: Record<BalanceId, BalanceSubscriptionMode> = {};
		for (const { balanceId, mode } of values(subs)) {
			// "live" wins over "poll"
			if (modes[balanceId] !== "live") {
				modes[balanceId] = mode;
			}
		}
		return modes;
	}),
	distinctUntilChanged<Record<BalanceId, BalanceSubscriptionMode>>(isEqual),
);

export const addBalanceSubscription = (
	balanceId: BalanceId,
	mode: BalanceSubscriptionMode = "live",
) => {
	const subscriptionId = crypto.randomUUID();

	allBalanceSubscriptions$.next(
		Object.assign(allBalanceSubscriptions$.value, {
			[subscriptionId]: { balanceId, mode },
		}),
	);

	return subscriptionId;
};

export const removeBalancesSubscription = (id: string) => {
	const current = allBalanceSubscriptions$.value;
	delete current[id];

	allBalanceSubscriptions$.next(current);
};
