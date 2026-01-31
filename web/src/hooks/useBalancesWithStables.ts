import type { PolkadotAccount } from "@kheopskit/core";
import type { Token, TokenId } from "@kheopswap/registry";
import {
	type BalanceSubscriptionMode,
	getBalance$,
} from "@kheopswap/services/balances";
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
	/** Subscription mode: "live" for real-time updates, "poll" for periodic updates (default: "live") */
	mode?: BalanceSubscriptionMode;
};

type UseBalancesWithStablesResult = LoadingState<AccountBalanceWithStable[]>;

const getBalanceWithStable$ = (
	tokenId: TokenId,
	address: string,
	mode: BalanceSubscriptionMode = "live",
): Observable<AccountBalanceWithStable> => {
	return getCachedObservable$(
		"getBalanceWithStable$",
		`${address},${tokenId},${mode}`,
		() =>
			getBalance$({ address, tokenId, mode }).pipe(
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
	mode: BalanceSubscriptionMode = "live",
): Observable<UseBalancesWithStablesResult> => {
	// If no accounts or no tokens, there's nothing to load
	if (!tokens.length || !accounts.length)
		return of({ data: [], isLoading: false });

	const observables = tokens.flatMap((token) =>
		accounts.map((acc) => {
			const address = typeof acc === "string" ? acc : acc.address;
			const tokenId = typeof token === "string" ? token : token.id;
			return getBalanceWithStable$(tokenId, address, mode);
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

// Cache key structure: JSON-encoded object to avoid delimiter conflicts
// (token IDs can contain various characters including base64)
type CacheKeyData = {
	mode: BalanceSubscriptionMode;
	tokens: string[];
	accounts: string[];
};

const encodeCacheKey = (data: CacheKeyData): string => JSON.stringify(data);

const parseCacheKey = (cacheKey: string): CacheKeyData => {
	if (!cacheKey) return { mode: "live", tokens: [], accounts: [] };
	try {
		return JSON.parse(cacheKey) as CacheKeyData;
	} catch {
		return { mode: "live", tokens: [], accounts: [] };
	}
};

// bind() only receives the serialized key - the observable factory uses getCachedObservable$
const [useBalancesWithStablesInternal] = bind((cacheKey: string) => {
	const { tokens, accounts, mode } = parseCacheKey(cacheKey);
	return getBalancesWithStables$(tokens, accounts, mode);
}, DEFAULT_VALUE);

export const useBalancesWithStables = ({
	tokens,
	accounts,
	mode = "live",
}: UseAccountBalancesWithStablesProps): UseBalancesWithStablesResult => {
	const safeTokens = tokens ?? [];
	const safeAccounts = accounts ?? [];

	const tokenIds = safeTokens.map((t) => (typeof t === "string" ? t : t.id));
	const accountAddresses = safeAccounts.map((a) =>
		typeof a === "string" ? a : a.address,
	);

	const cacheKey = encodeCacheKey({
		mode,
		tokens: tokenIds,
		accounts: accountAddresses,
	});

	return useBalancesWithStablesInternal(cacheKey);
};
