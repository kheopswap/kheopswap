import type { ChainId, TokenId } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
import { fromPairs, isEqual } from "lodash-es";
import {
	combineLatest,
	distinctUntilChanged,
	map,
	type Observable,
	shareReplay,
} from "rxjs";
import {
	type ChainTokensState,
	type TokenState,
	tokensByChainState$,
	tokensByIdState$,
} from "./state";

const DEFAULT_VALUE_BY_CHAIN: ChainTokensState = {
	status: "stale",
	tokens: {},
};

export const getTokensByChain$ = (chainId: ChainId) => {
	return getCachedObservable$("getTokensByChain$", chainId, () =>
		tokensByChainState$.pipe(
			map(
				(statusAndTokens) => statusAndTokens[chainId] ?? DEFAULT_VALUE_BY_CHAIN,
			),
			distinctUntilChanged<ChainTokensState>(isEqual),
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);
};

export const getTokensByChains$ = (
	chainIds: ChainId[],
): Observable<Record<string, ChainTokensState | undefined>> =>
	combineLatest(chainIds.map(getTokensByChain$)).pipe(
		map((arChainTokens) =>
			fromPairs(
				chainIds.map((chainId, index) => [chainId, arChainTokens[index]]),
			),
		),
	);

const DEFAULT_VALUE_BY_TOKEN: TokenState = {
	status: "stale",
	token: undefined,
};

export const getTokenById$ = (tokenId: TokenId) => {
	return getCachedObservable$("getTokenById$", tokenId, () =>
		tokensByIdState$.pipe(
			map(
				(statusAndTokens) => statusAndTokens[tokenId] ?? DEFAULT_VALUE_BY_TOKEN,
			),
			distinctUntilChanged<TokenState>(isEqual),
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);
};

export const getTokensById$ = (
	tokenIds: TokenId[],
): Observable<Record<string, TokenState | undefined>> =>
	combineLatest(tokenIds.map(getTokenById$)).pipe(
		map((arTokens) =>
			fromPairs(tokenIds.map((tokenId, index) => [tokenId, arTokens[index]])),
		),
	);
