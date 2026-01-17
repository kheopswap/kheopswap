import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import type { TokenId, TokenInfo } from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { type Dictionary, keyBy, pickBy, values } from "lodash";
import { BehaviorSubject, debounceTime } from "rxjs";

const STORAGE_KEY = getLocalStorageKey("token-infos");

const loadTokenInfos = (): Dictionary<TokenInfo> => {
	try {
		const strTokenInfos = localStorage.getItem(STORAGE_KEY);
		const tokenInfosList: TokenInfo[] =
			strTokenInfos && !DEV_IGNORE_STORAGE ? safeParse(strTokenInfos) : [];

		const tokensInfosMap = keyBy(tokenInfosList, "id");

		return tokensInfosMap;
	} catch (err) {
		console.error("Failed to load token infos", err);
		return {};
	}
};

const saveTokenInfos = (tokens: Dictionary<TokenInfo>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(tokens)));
	} catch (err) {
		console.error("Failed to save token infos", err);
	}
};

const stop = logger.timer("initializing token infos store");
export const tokenInfosStore$ = new BehaviorSubject<Dictionary<TokenInfo>>(
	loadTokenInfos(),
);
stop();

// save after updates
tokenInfosStore$.pipe(debounceTime(1_000)).subscribe(saveTokenInfos);

/**
 * Remove token info entries that are no longer being watched.
 * Called when watchers are removed to prevent unbounded store growth.
 */
export const cleanupTokenInfosStore = (activeTokenIds: Set<TokenId>) => {
	const current = tokenInfosStore$.value;
	const cleaned = pickBy(current, (_, id) => activeTokenIds.has(id as TokenId));

	if (Object.keys(cleaned).length < Object.keys(current).length) {
		tokenInfosStore$.next(cleaned);
	}
};
