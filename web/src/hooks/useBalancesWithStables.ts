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
import { getStablePlancks$ } from "../state/prices";
import type { AccountBalanceWithStable } from "../types/balances";
import { bindSerialized } from "../utils/bindSerialized";
import { getCachedObservable$ } from "../utils/getCachedObservable";

type UseAccountBalancesWithStablesProps = {
	tokens: Token[] | TokenId[] | null | undefined;
	accounts: WalletAccount[] | string[] | null | undefined;
};

const getBalanceWithStable$ = (
	tokenId: TokenId,
	address: string,
): Observable<AccountBalanceWithStable> => {
	return getCachedObservable$(
		"getBalanceWithStable$",
		`${address},${tokenId}`,
		() =>
			getBalance$({ address, tokenId }).pipe(
				switchMap(({ balance, status }) =>
					getStablePlancks$(tokenId, balance).pipe(
						map(({ stablePlancks, isLoadingStablePlancks }) => ({
							address,
							tokenId,
							tokenPlancks: balance ?? null,
							isLoadingTokenPlancks: status !== "loaded",
							stablePlancks,
							isLoadingStablePlancks,
						})),
					),
				),
				shareReplay({ bufferSize: 1, refCount: true }),
			),
	);
};

type UseBalancesWithStablesResult = {
	data: AccountBalanceWithStable[];
	isLoading: boolean;
};

const DEFAULT_VALUE: UseBalancesWithStablesResult = {
	data: [],
	isLoading: true,
};

const useBalancesWithStablesByIds = bindSerialized(
	({
		tokenIds,
		addresses,
	}: {
		tokenIds: TokenId[];
		addresses: string[];
	}): Observable<UseBalancesWithStablesResult> => {
		if (!tokenIds.length || !addresses.length) return of(DEFAULT_VALUE);

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
	},
	() => DEFAULT_VALUE,
);

export const useBalancesWithStables = ({
	tokens,
	accounts,
}: UseAccountBalancesWithStablesProps) =>
	useBalancesWithStablesByIds({
		tokenIds: (tokens ?? []).map((token) =>
			typeof token === "string" ? token : token.id,
		),
		addresses: (accounts ?? []).map((acc) =>
			typeof acc === "string" ? acc : acc.address,
		),
	});
