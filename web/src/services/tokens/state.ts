import { fromPairs, groupBy, keyBy, toPairs, values } from "lodash-es";
import { combineLatest, map, shareReplay } from "rxjs";
import type { ChainId } from "../../registry/chains/types";
import type { Token } from "../../registry/tokens/types";
import { logger } from "../../utils/logger";
import type { LoadingStatus } from "../common";
import { tokensStore$ } from "./store";
import { sortTokens } from "./utils";
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
