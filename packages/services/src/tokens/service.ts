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
import { getCachedObservable$ } from "@kheopswap/utils";

const DEFAULT_VALUE_BY_CHAIN: ChainTokensState = {
	status: "stale",
	tokens: {},
};

export const getTokensByChain$ = (chainId: ChainId) => {
	return getCachedObservable$("getTokensByChain$", chainId, () =>
		new Observable<ChainTokensState>((subscriber) => {
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
		}).pipe(shareReplay(1)),
	);
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

export const getTokenById$ = (tokenId: TokenId) => {
	return getCachedObservable$("getTokenById$", tokenId, () =>
		new Observable<TokenState>((subscriber) => {
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
		}).pipe(shareReplay(1)),
	);
};

export const getTokensById$ = (
	tokenIds: TokenId[],
): Observable<Dictionary<TokenState>> =>
	combineLatest(tokenIds.map(getTokenById$)).pipe(
		map((arTokens) =>
			fromPairs(tokenIds.map((tokenId, index) => [tokenId, arTokens[index]])),
		),
	);
