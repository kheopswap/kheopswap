import {
	BehaviorSubject,
	debounceTime,
	distinctUntilChanged,
	map,
	shareReplay,
} from "rxjs";

import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import {
	type ChainId,
	KNOWN_TOKENS_LIST,
	KNOWN_TOKENS_MAP,
	TOKENS_OVERRIDES_MAP,
	type Token,
	type TokenHydrationAsset,
	type TokenType,
	getChains,
} from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { type Dictionary, entries, isEqual, keyBy, values } from "lodash";

export type StorageToken = Pick<Token, "id" | "chainId" | "type"> &
	Partial<Omit<Token, "id" | "chainId" | "type">>;

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("tokens"));
localStorage.removeItem(getLocalStorageKey("tokens::v2"));

const STORAGE_KEY = getLocalStorageKey("tokens::v3");

const loadTokens = (): Dictionary<StorageToken> => {
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

const saveTokens = (tokens: Dictionary<StorageToken>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(tokens)));
	} catch (err) {
		console.error("Failed to save tokens", err);
	}
};

const stop = logger.timer("initializing tokens store");
const tokensStoreData$ = new BehaviorSubject<Dictionary<StorageToken>>(
	loadTokens(),
);
stop();

// save after updates
tokensStoreData$.pipe(debounceTime(1_000)).subscribe(saveTokens);

export const updateTokensStore = (
	chainId: ChainId,
	type: TokenType,
	tokens: StorageToken[],
) => {
	const stop = logger.cumulativeTimer("updateTokensStore");

	const currentTokens = values(tokensStoreData$.value);

	const otherTokens = currentTokens.filter(
		(t) => t.chainId !== chainId || t.type !== type,
	);

	const newValue = keyBy(
		[
			...otherTokens,
			...tokens.filter((t) => t.id && t.type === type && t.chainId === chainId),
		],
		"id",
	);

	tokensStoreData$.next(newValue);

	stop();
};

//store may contain incomplete information, such as for XC tokens whose symbol can only be found on the source chain
export const tokensStore$ = tokensStoreData$.pipe(
	distinctUntilChanged(isEqual),
	map<Dictionary<StorageToken>, Dictionary<Token>>((storageTokensMap) => {
		const stop = logger.timer("consolidate tokensStore$");
		const storageTokens = values(storageTokensMap);

		const chains = getChains();
		const availableChainIds = chains.map((c) => c.id);

		const tokens = storageTokens
			.map((token) => {
				if (token.type === "hydration-asset") {
					if (!("location" in token) || !("origin" in token)) return null;
					if (!availableChainIds.includes(token.chainId)) return null;

					const originToken = storageTokensMap[token.origin as string];
					if (!originToken) return null;

					const { symbol, decimals, name, logo, verified } = originToken;
					return {
						...token,
						symbol,
						decimals,
						name,
						logo,
						verified,
					} as TokenHydrationAsset;
				}

				return token as Token;
			})
			.filter(Boolean) as Token[];

		const tokensMap = keyBy(tokens, "id");

		stop();

		return tokensMap;
	}),
	shareReplay(1),
);
