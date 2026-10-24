import { fromPairs, isEqual } from "lodash-es";
import {
	combineLatest,
	distinctUntilChanged,
	map,
	Observable,
	of,
	shareReplay,
} from "rxjs";
import type { ChainId } from "../../registry/chains/types";
import { getChainIdFromTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import {
	type ChainTokensState,
	type TokenState,
	tokensByChainState$,
} from "./state";
import {
	addTokensByChainSubscription,
	removeTokensByChainSubscription,
} from "./subscriptions";

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
): Observable<Record<string, ChainTokensState | undefined>> =>
	combineLatest(chainIds.map(getTokensByChain$)).pipe(
		map((arChainTokens) =>
			fromPairs(
				chainIds.map((chainId, index) => [chainId, arChainTokens[index]]),
			),
		),
	);

const MISSING_TOKEN: TokenState = { status: "loaded", token: undefined };

export const getTokenById$ = (tokenId: TokenId) =>
	getCachedObservable$("getTokenById$", tokenId, () => {
		const chainId = getChainIdFromTokenId(tokenId);
		if (!chainId) return of(MISSING_TOKEN);
		return getTokensByChain$(chainId).pipe(
			map(
				({ status, tokens }): TokenState => ({
					status,
					token: tokens[tokenId],
				}),
			),
			distinctUntilChanged<TokenState>(isEqual),
			shareReplay({ bufferSize: 1, refCount: true }),
		);
	});

/** @knipignore */
export const getTokensById$ = (
	tokenIds: TokenId[],
): Observable<Record<string, TokenState | undefined>> =>
	combineLatest(tokenIds.map(getTokenById$)).pipe(
		map((arTokens) =>
			fromPairs(tokenIds.map((tokenId, index) => [tokenId, arTokens[index]])),
		),
	);
