import isEqual from "lodash-es/isEqual";
import {
	combineLatest,
	distinctUntilChanged,
	map,
	Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import { getResolvedSubstrateAddress$ } from "../addressResolution/service";
import { balancesState$ } from "./state";
import { balancesStore$ } from "./store";
import { addBalanceSubscription } from "./subscriptions";
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
					return of<BalanceState>({ balance: undefined, status });
				}

				const resolvedBalanceId = getBalanceId({
					...def,
					address: resolvedAddress as BalanceDef["address"],
				});

				return new Observable<BalanceState>((subscriber) => {
					const removeSubscription = addBalanceSubscription(resolvedBalanceId);

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
						removeSubscription();
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

export const heldTokenIds$: Observable<TokenId[]> = balancesStore$.pipe(
	map((store) =>
		[
			...new Set(
				Object.values(store)
					.filter(({ balance }) => balance > 0n)
					.map(({ tokenId }) => tokenId),
			),
		].sort(),
	),
	distinctUntilChanged<TokenId[]>(isEqual),
	shareReplay({ bufferSize: 1, refCount: true }),
);
