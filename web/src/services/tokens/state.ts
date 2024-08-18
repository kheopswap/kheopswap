import {
	type Dictionary,
	fromPairs,
	groupBy,
	keyBy,
	toPairs,
	values,
} from "lodash";
import { combineLatest, map } from "rxjs";

import { tokensStore$ } from "./store";
import { sortTokens } from "./util";
import { chainTokensStatuses$ } from "./watchers";

import type { ChainId } from "src/config/chains";
import type { Token } from "src/config/tokens";
import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

export type ChainTokensState = {
	status: LoadingStatus;
	tokens: Dictionary<Token>;
};

export type TokenState = { status: LoadingStatus; token: Token | undefined };

const combineStateByChainId = (
	statusByChain: Record<ChainId, LoadingStatus>,
	tokens: Dictionary<Token>,
): Dictionary<ChainTokensState> => {
	try {
		const tokensByChain = groupBy(values(tokens).sort(sortTokens), "chainId");

		return fromPairs(
			toPairs(statusByChain).map(([chainId, status]) => [
				chainId,
				{
					status,
					tokens: keyBy(tokensByChain[chainId as ChainId] ?? [], "id"),
				},
			]),
		);
	} catch (err) {
		logger.error("Failed to merge tokens by chain state", { err });
		return {} as Record<ChainId, ChainTokensState>;
	}
};

export const tokensByChainState$ = combineLatest([
	chainTokensStatuses$,
	tokensStore$,
]).pipe(
	map(([statusByChain, tokens]) =>
		combineStateByChainId(statusByChain, tokens),
	),
);

const combineStateByTokenId = (
	statusByChain: Record<ChainId, LoadingStatus>,
	tokens: Dictionary<Token>,
): Dictionary<TokenState> => {
	try {
		return fromPairs(
			toPairs(tokens).map(([tokenId, token]) => [
				tokenId,
				{
					status: statusByChain[token.chainId] ?? "stale",
					token,
				},
			]),
		);
	} catch (err) {
		logger.error("Failed to merge tokens state", { err });
		return {};
	}
};

export const tokensByIdState$ = combineLatest([
	chainTokensStatuses$,
	tokensStore$,
]).pipe(
	map(([statusByChain, tokens]) =>
		combineStateByTokenId(statusByChain, tokens),
	),
);
