import { keyBy, values } from "lodash-es";
import { BehaviorSubject, debounceTime } from "rxjs";
import { DEV_IGNORE_STORAGE } from "../../common/constants";
import type { TokenInfo } from "../../registry/tokens/types";
import { getLocalStorageKey } from "../../utils/getLocalStorageKey";
import { logger } from "../../utils/logger";
import { safeParse, safeStringify } from "../../utils/serialization";

const STORAGE_KEY = getLocalStorageKey("token-infos");

const loadTokenInfos = (): Record<string, TokenInfo> => {
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

const saveTokenInfos = (tokens: Record<string, TokenInfo>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(tokens)));
	} catch (err) {
		console.error("Failed to save token infos", err);
	}
};

const stop = logger.timer("initializing token infos store");
export const tokenInfosStore$ = new BehaviorSubject<Record<string, TokenInfo>>(
	loadTokenInfos(),
);
stop();

// save after updates
tokenInfosStore$.pipe(debounceTime(1_000)).subscribe(saveTokenInfos);
