import type { WalletAccount } from "@kheopskit/core";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import {
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	throttleTime,
} from "rxjs";
import type { Token, TokenId } from "../registry/tokens/types";
import { getBalance$ } from "../services/balances/service";
import { getStablePlancks$ } from "../state/prices";
import type { AccountBalanceWithStable } from "../types/balances";
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

const DEFAULT_VALUE = { data: [], isLoading: true };

export const useBalancesWithStables = ({
	tokens,
	accounts,
}: UseAccountBalancesWithStablesProps) => {
	const obs = useMemo(() => {
		if (!tokens?.length || !accounts?.length) return of(DEFAULT_VALUE);

		const observables = (tokens ?? []).flatMap((token) =>
			(accounts ?? []).map((acc) => {
				const address = typeof acc === "string" ? acc : acc.address;
				const tokenId = typeof token === "string" ? token : token.id;
				return getBalanceWithStable$(tokenId, address);
			}),
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
	}, [accounts, tokens]);

	return useObservable(obs, DEFAULT_VALUE);
};
