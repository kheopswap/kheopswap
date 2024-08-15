import { BehaviorSubject, debounceTime } from "rxjs";

import { type Dictionary, keyBy, values } from "lodash";
import { DEV_IGNORE_STORAGE } from "src/config/constants";
import type { TokenInfo } from "src/config/tokens";
import { logger, safeParse, safeStringify } from "src/util";
import { getLocalStorageKey } from "src/util/getLocalStorageKey";

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
