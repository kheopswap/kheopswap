import { combineLatest, map, throttleTime } from "rxjs";

import type { TokenId, TokenInfo } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { type Dictionary, fromPairs, keys } from "lodash";
import type { LoadingStatus } from "../common";
import { tokenInfosStore$ } from "./store";
import { tokenInfosSubscriptions$ } from "./subscriptions";
import type { TokenInfoState } from "./types";
import { tokenInfosStatuses$ } from "./watchers";

const combineState = (
	tokenIds: TokenId[],
	statuses: Dictionary<LoadingStatus>,
	tokenInfos: Dictionary<TokenInfo>,
): Dictionary<TokenInfoState> => {
	try {
		const allTokenIds = [
			...new Set<TokenId>(tokenIds.concat(keys(tokenInfos))),
		];

		return fromPairs(
			allTokenIds.map((tokenId) => {
				const status = statuses[tokenId] ?? "stale";
				const tokenInfo = tokenInfos[tokenId];
				const tokenInfoState: TokenInfoState = { status, tokenInfo };

				return [tokenId, tokenInfoState];
			}),
		);
	} catch (err) {
		logger.error("Failed to merge balances state", { err });
		return {};
	}
};

export const tokenInfosState$ = combineLatest([
	tokenInfosSubscriptions$, // unique subscriptions
	tokenInfosStatuses$, // status of each subscription
	tokenInfosStore$, // stored balances
]).pipe(
	throttleTime(100, undefined, { leading: true, trailing: true }),
	map(([balanceIds, statuses, balances]) =>
		combineState(balanceIds, statuses, balances),
	),
);
