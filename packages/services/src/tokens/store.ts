import { BehaviorSubject, debounceTime } from "rxjs";

import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import {
	KNOWN_TOKENS_LIST,
	KNOWN_TOKENS_MAP,
	TOKENS_OVERRIDES_MAP,
	type Token,
} from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { type Dictionary, entries, keyBy, values } from "lodash";

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("tokens"));
localStorage.removeItem(getLocalStorageKey("tokens::v2"));

const STORAGE_KEY = getLocalStorageKey("tokens::v3");

const loadTokens = (): Dictionary<Token> => {
	try {
		const strTokens = localStorage.getItem(STORAGE_KEY);
		const tokensList: Token[] =
			strTokens && !DEV_IGNORE_STORAGE
				? safeParse(strTokens)
				: KNOWN_TOKENS_LIST;

		const tokensMap = keyBy(tokensList, "id");

		// override with our static info
		for (const [tokenId, token] of entries(KNOWN_TOKENS_MAP))
			tokensMap[tokenId] = Object.assign(tokensMap[tokenId] ?? {}, token);

		for (const [tokenId, overrides] of entries(TOKENS_OVERRIDES_MAP))
			if (tokensMap[tokenId])
				tokensMap[tokenId] = Object.assign(tokensMap[tokenId], overrides);

		return tokensMap;
	} catch (err) {
		console.error("Failed to load tokens", err);
		return keyBy(KNOWN_TOKENS_LIST, "id");
	}
};

const saveTokens = (tokens: Dictionary<Token>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(tokens)));
	} catch (err) {
		console.error("Failed to save tokens", err);
	}
};

const stop = logger.timer("initializing tokens store");
export const tokensStore$ = new BehaviorSubject<Dictionary<Token>>(
	loadTokens(),
);
stop();

// save after updates
tokensStore$.pipe(debounceTime(1_000)).subscribe(saveTokens);
