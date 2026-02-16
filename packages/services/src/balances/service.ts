import { parseTokenId } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
import isEqual from "lodash-es/isEqual";
import {
	combineLatest,
	distinctUntilChanged,
	map,
	Observable,
	shareReplay,
	switchMap,
} from "rxjs";
import { getResolvedSubstrateAddress$ } from "../addressResolution";
import { balancesState$ } from "./state";
import {
	addBalanceSubscription,
	removeBalancesSubscription,
} from "./subscriptions";
import type { BalanceDef, BalanceState } from "./types";
import { getBalanceId } from "./utils";

const DEFAULT_BALANCE_STATE: BalanceState = {
	balance: undefined,
	status: "stale",
};

export const getBalance$ = (def: BalanceDef) => {
	const inputBalanceId = getBalanceId(def);
	const chainId = parseTokenId(def.tokenId).chainId;

	return getCachedObservable$("getBalance$", inputBalanceId, () =>
		getResolvedSubstrateAddress$({ address: def.address, chainId }).pipe(
			switchMap(({ address: resolvedAddress, status }) => {
				if (status !== "loaded" || !resolvedAddress) {
					return new Observable<BalanceState>((subscriber) => {
						subscriber.next({ balance: undefined, status });
						subscriber.complete();
					});
				}

				const resolvedBalanceId = getBalanceId({
					...def,
					address: resolvedAddress as BalanceDef["address"],
				});

				return new Observable<BalanceState>((subscriber) => {
					const subId = addBalanceSubscription(resolvedBalanceId);

					const sub = balancesState$
						.pipe(
							map(
								(balances) =>
									balances[resolvedBalanceId] ?? DEFAULT_BALANCE_STATE,
							),
							distinctUntilChanged(isEqual),
						)
						.subscribe(subscriber);

					return () => {
						sub.unsubscribe();
						removeBalancesSubscription(subId);
					};
				});
			}),
			shareReplay({ refCount: true, bufferSize: 1 }),
		),
	);
};

export const getBalances$ = (defs: BalanceDef[]) => {
	return getCachedObservable$(
		"getBalances$",
		defs.map(getBalanceId).join(","),
		() =>
			combineLatest(defs.map(getBalance$)).pipe(
				shareReplay({ refCount: true, bufferSize: 1 }),
			),
	);
};
