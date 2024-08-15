import { BehaviorSubject, combineLatest, debounceTime, map } from "rxjs";

import { type Dictionary, fromPairs, keys } from "lodash";
import type { TokenId, TokenInfo } from "src/config/tokens";
import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";
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

// contains all known balances and their status
export const tokenInfosState$ = new BehaviorSubject<Dictionary<TokenInfoState>>(
	combineState([], tokenInfosStatuses$.value, tokenInfosStore$.value),
);

// maintain the above up to date
combineLatest([
	tokenInfosSubscriptions$, // unique subscriptions
	tokenInfosStatuses$, // status of each subscription
	tokenInfosStore$, // stored balances
])
	.pipe(
		debounceTime(50),
		map(([balanceIds, statuses, balances]) =>
			combineState(balanceIds, statuses, balances),
		),
	)
	.subscribe((balances) => {
		tokenInfosState$.next(balances);
	});
