import type { PolkadotAccount } from "@kheopskit/core";
import type { Token, TokenId } from "@kheopswap/registry";
import { getBalance$ } from "@kheopswap/services/balances";
import { getCachedObservable$ } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import {
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import { getStablePlancks$ } from "src/state";
import type { AccountBalanceWithStable, LoadingState } from "src/types";

type UseAccountBalancesWithStablesProps = {
	tokens: Token[] | TokenId[] | null | undefined;
	accounts: PolkadotAccount[] | string[] | null | undefined;
};

type UseBalancesWithStablesResult = LoadingState<AccountBalanceWithStable[]>;

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

const DEFAULT_VALUE: UseBalancesWithStablesResult = {
	data: [],
	isLoading: false,
};

const getBalancesWithStables$ = (
	tokens: (Token | TokenId)[],
	accounts: (PolkadotAccount | string)[],
): Observable<UseBalancesWithStablesResult> => {
	// If no accounts or no tokens, there's nothing to load
	if (!tokens.length || !accounts.length)
		return of({ data: [], isLoading: false });

	const observables = tokens.flatMap((token) =>
		accounts.map((acc) => {
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
};

// Parse cache key back into tokens and accounts (use || and ,, as separators since tokenIds contain ::)
const parseCacheKey = (
	cacheKey: string,
): { tokens: string[]; accounts: string[] } => {
	if (!cacheKey) return { tokens: [], accounts: [] };
	const [tokensStr, accountsStr] = cacheKey.split("||||");
	const tokens = tokensStr ? tokensStr.split(",,") : [];
	const accounts = accountsStr ? accountsStr.split(",,") : [];
	return { tokens, accounts };
};

// bind() only receives the serialized key - the observable factory uses getCachedObservable$
const [useBalancesWithStablesInternal] = bind((cacheKey: string) => {
	const { tokens, accounts } = parseCacheKey(cacheKey);
	return getBalancesWithStables$(tokens, accounts);
}, DEFAULT_VALUE);

export const useBalancesWithStables = ({
	tokens,
	accounts,
}: UseAccountBalancesWithStablesProps): UseBalancesWithStablesResult => {
	const safeTokens = tokens ?? [];
	const safeAccounts = accounts ?? [];
	// Create stable cache key (use || and ,, as separators since tokenIds contain ::)
	const tokensKey = safeTokens
		.map((t) => (typeof t === "string" ? t : t.id))
		.join(",,");
	const accountsKey = safeAccounts
		.map((a) => (typeof a === "string" ? a : a.address))
		.join(",,");
	const cacheKey = `${tokensKey}||||${accountsKey}`;
	return useBalancesWithStablesInternal(cacheKey);
};
