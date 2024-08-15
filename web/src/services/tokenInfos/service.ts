import { isEqual } from "lodash";
import { distinctUntilChanged, map, tap } from "rxjs";
import type { TokenId } from "src/config/tokens";
import { tokenInfosState$ } from "./state";
import {
	addTokenInfosSubscription,
	removeTokenInfosSubscription,
} from "./subscriptions";
import type { TokenInfoState } from "./types";

const DEFAULT_TOKEN_INFO_STATE: TokenInfoState = {
	tokenInfo: undefined,
	status: "stale",
};

export const getTokenInfos$ = (tokenIds: TokenId[]) => {
	let subId = "";

	return tokenInfosState$.pipe(
		tap({
			subscribe: () => {
				if (tokenIds.length) subId = addTokenInfosSubscription(tokenIds);
			},
			unsubscribe: () => {
				if (tokenIds.length) removeTokenInfosSubscription(subId);
			},
		}),
		map((tokenInfos) =>
			tokenIds.map((id) => tokenInfos[id] ?? DEFAULT_TOKEN_INFO_STATE),
		),
		distinctUntilChanged<TokenInfoState[]>(isEqual),
	);
};
