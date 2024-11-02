import { type Dictionary, fromPairs, isEqual } from "lodash";
import {
	Observable,
	combineLatest,
	distinctUntilChanged,
	map,
	shareReplay,
} from "rxjs";

import {
	type ChainTokensState,
	type TokenState,
	tokensByChainState$,
	tokensByIdState$,
} from "./state";
import {
	addTokensByChainSubscription,
	removeTokensByChainSubscription,
} from "./subscriptions";

import type { ChainId } from "@kheopswap/registry";
import { type TokenId, getChainIdFromTokenId } from "@kheopswap/registry";

const DEFAULT_VALUE_BY_CHAIN: ChainTokensState = {
	status: "stale",
	tokens: {},
};

const CACHE_TOKENS_BY_CHAINS = new Map<ChainId, Observable<ChainTokensState>>();

export const getTokensByChain$ = (chainId: ChainId) => {
	if (!CACHE_TOKENS_BY_CHAINS.has(chainId)) {
		const obs = new Observable<ChainTokensState>((subscriber) => {
			const subId = addTokensByChainSubscription([chainId]);

			const sub = tokensByChainState$
				.pipe(
					map(
						(statusAndTokens) =>
							statusAndTokens[chainId] ?? DEFAULT_VALUE_BY_CHAIN,
					),
					distinctUntilChanged<ChainTokensState>(isEqual),
				)
				.subscribe(subscriber);

			return () => {
				sub.unsubscribe();
				removeTokensByChainSubscription(subId);
			};
		}).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

		CACHE_TOKENS_BY_CHAINS.set(chainId, obs);
	}

	return CACHE_TOKENS_BY_CHAINS.get(chainId) as Observable<ChainTokensState>;
};

export const getTokensByChains$ = (
	chainIds: ChainId[],
): Observable<Dictionary<ChainTokensState>> =>
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

const CACHE_TOKEN_BY_ID = new Map<TokenId, Observable<TokenState>>();

const getTokenById$ = (tokenId: TokenId) => {
	if (!CACHE_TOKEN_BY_ID.has(tokenId)) {
		const obs = new Observable<TokenState>((subscriber) => {
			const chainId = getChainIdFromTokenId(tokenId);
			const subId = addTokensByChainSubscription([chainId]);

			const sub = tokensByIdState$
				.pipe(
					map(
						(statusAndTokens) =>
							statusAndTokens[tokenId] ?? DEFAULT_VALUE_BY_TOKEN,
					),
					distinctUntilChanged<TokenState>(isEqual),
				)
				.subscribe(subscriber);

			return () => {
				sub.unsubscribe();
				removeTokensByChainSubscription(subId);
			};
		}).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

		CACHE_TOKEN_BY_ID.set(tokenId, obs);
	}

	return CACHE_TOKEN_BY_ID.get(tokenId) as Observable<TokenState>;
};

export const getTokensById$ = (
	tokenIds: TokenId[],
): Observable<Dictionary<TokenState>> =>
	combineLatest(tokenIds.map(getTokenById$)).pipe(
		map((arTokens) =>
			fromPairs(tokenIds.map((tokenId, index) => [tokenId, arTokens[index]])),
		),
	);
