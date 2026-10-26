import {
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	throttleTime,
} from "rxjs";
import type { WalletAccount } from "../common/kheopskit";
import type { Token, TokenId } from "../registry/tokens/types";
import { getBalance$ } from "../services/balances/service";
import { getHoldingStablePlancks$ } from "../state/prices";
import type { AccountBalanceWithStable } from "../types/balances";
import { uniqByPublicKey } from "../utils/accountPublicKey";
import { bindSerialized } from "../utils/bindSerialized";
import { getCachedObservable$ } from "../utils/getCachedObservable";

type UseAccountBalancesWithStablesProps = {
	tokens: Token[] | TokenId[] | null | undefined;
	accounts: WalletAccount[] | string[] | null | undefined;
};

const getBalanceWithStable$ = (
	tokenId: TokenId,
	address: string,
): Observable<AccountBalanceWithStable> =>
	getCachedObservable$("getBalanceWithStable$", `${address},${tokenId}`, () =>
		getBalance$({ address, tokenId }).pipe(
			switchMap(({ balance, status }) =>
				getHoldingStablePlancks$(tokenId, balance).pipe(
					map((valuation) => ({
						address,
						tokenId,
						tokenPlancks: balance ?? null,
						isLoadingTokenPlancks: status !== "loaded",
						...valuation,
					})),
				),
			),
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);

type UseBalancesWithStablesResult = {
	data: AccountBalanceWithStable[];
	isLoading: boolean;
};

const LOADING: UseBalancesWithStablesResult = { data: [], isLoading: true };
const NOTHING_TO_WATCH: UseBalancesWithStablesResult = {
	data: [],
	isLoading: false,
};

export const getBalancesWithStables$ = ({
	tokenIds,
	addresses,
}: {
	tokenIds: TokenId[];
	addresses: string[];
}): Observable<UseBalancesWithStablesResult> => {
	if (!tokenIds.length || !addresses.length) return of(NOTHING_TO_WATCH);

	const observables = tokenIds.flatMap((tokenId) =>
		addresses.map((address) => getBalanceWithStable$(tokenId, address)),
	);

	return combineLatest(observables).pipe(
		throttleTime(300, undefined, { leading: true, trailing: true }),
		map((data) => ({
			data,
			isLoading: data.some(
				({ isLoadingTokenPlancks, isLoadingStablePlancks }) =>
					isLoadingTokenPlancks || isLoadingStablePlancks,
			),
		})),
	);
};

const useBalancesWithStablesByIds = bindSerialized(
	getBalancesWithStables$,
	() => LOADING,
);

export const useBalancesWithStables = ({
	tokens,
	accounts,
}: UseAccountBalancesWithStablesProps) =>
	useBalancesWithStablesByIds({
		tokenIds: (tokens ?? []).map((token) =>
			typeof token === "string" ? token : token.id,
		),
		addresses: uniqByPublicKey(
			(accounts ?? []).map((acc) =>
				typeof acc === "string" ? acc : acc.address,
			),
			(address) => address,
		),
	});
