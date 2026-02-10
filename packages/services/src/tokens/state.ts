import type { ChainId, Token } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { fromPairs, groupBy, keyBy, toPairs, values } from "lodash-es";
import { combineLatest, map, shareReplay } from "rxjs";
import type { LoadingStatus } from "../common";
import { tokensStore$ } from "./store";
import { sortTokens } from "./util";
import { chainTokensStatuses$ } from "./watchers";

export type ChainTokensState = {
	status: LoadingStatus;
	tokens: Record<string, Token>;
};

export type TokenState = { status: LoadingStatus; token: Token | undefined };

const combineStateByChainId = (
	statusByChain: Record<ChainId, LoadingStatus>,
	tokens: Record<string, Token>,
): Record<string, ChainTokensState> => {
	const stop = logger.cumulativeTimer("tokens.combineStateByChainId");
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
	} finally {
		stop();
	}
};

export const tokensByChainState$ = combineLatest([
	chainTokensStatuses$,
	tokensStore$,
]).pipe(
	map(([statusByChain, tokens]) =>
		combineStateByChainId(statusByChain, tokens),
	),
	shareReplay(1),
);

const combineStateByTokenId = (
	statusByChain: Record<ChainId, LoadingStatus>,
	tokens: Record<string, Token>,
): Record<string, TokenState> => {
	const stop = logger.cumulativeTimer("tokens.combineStateByTokenId");
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
	} finally {
		stop();
	}
};

export const tokensByIdState$ = combineLatest([
	chainTokensStatuses$,
	tokensStore$,
]).pipe(
	map(([statusByChain, tokens]) =>
		combineStateByTokenId(statusByChain, tokens),
	),
	shareReplay(1),
);
