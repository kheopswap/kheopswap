import type { WalletAccount } from "@kheopskit/core";
import type { Token, TokenId } from "@kheopswap/registry";
import { getBalance$ } from "@kheopswap/services/balances";
import { getCachedObservable$ } from "@kheopswap/utils";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import {
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import { getStablePlancks$ } from "src/state";
import type { AccountBalanceWithStable } from "src/types";

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
