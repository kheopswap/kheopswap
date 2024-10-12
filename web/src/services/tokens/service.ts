import { type Dictionary, fromPairs, isEqual } from "lodash";
import { distinctUntilChanged, map, tap } from "rxjs";

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

export const getTokensByChains$ = (chainIds: ChainId[]) => {
	let subId = "";

	return tokensByChainState$.pipe(
		tap({
			subscribe: () => {
				if (chainIds.length) subId = addTokensByChainSubscription(chainIds);
			},
			unsubscribe: () => {
				if (chainIds.length) removeTokensByChainSubscription(subId);
			},
		}),
		map((statusAndTokens) =>
			Object.fromEntries(
				chainIds.map((chainId) => [
					chainId,
					statusAndTokens[chainId] ?? DEFAULT_VALUE_BY_CHAIN,
				]),
			),
		),
		distinctUntilChanged<Dictionary<ChainTokensState>>(isEqual),
	);
};

const DEFAULT_VALUE_BY_TOKEN: TokenState = {
	status: "stale",
	token: undefined,
};

export const getTokensById$ = (tokenIds: TokenId[]) => {
	const chainIds = tokenIds.map(getChainIdFromTokenId);
	let subId = "";

	return tokensByIdState$.pipe(
		tap({
			subscribe: () => {
				if (chainIds.length) subId = addTokensByChainSubscription(chainIds);
			},
			unsubscribe: () => {
				if (chainIds.length) removeTokensByChainSubscription(subId);
			},
		}),
		map((statusAndTokens) =>
			fromPairs(
				tokenIds.map((tokenId) => [
					tokenId,
					statusAndTokens[tokenId] ?? DEFAULT_VALUE_BY_TOKEN,
				]),
			),
		),
		distinctUntilChanged<Dictionary<TokenState>>(isEqual),
	);
};
