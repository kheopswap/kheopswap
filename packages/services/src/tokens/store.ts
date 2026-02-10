import { DEV_IGNORE_STORAGE } from "@kheopswap/constants";
import {
	type ChainId,
	getChains,
	KNOWN_TOKENS_LIST,
	KNOWN_TOKENS_MAP,
	TOKENS_OVERRIDES_MAP,
	type Token,
	type TokenType,
} from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import { entries, isEqual, keyBy, values } from "lodash-es";
import {
	BehaviorSubject,
	debounceTime,
	distinctUntilChanged,
	map,
	shareReplay,
} from "rxjs";

export type StorageToken = Pick<Token, "id" | "chainId" | "type"> &
	Partial<Omit<Token, "id" | "chainId" | "type">>;

// cleanup old keys
localStorage.removeItem(getLocalStorageKey("tokens"));
localStorage.removeItem(getLocalStorageKey("tokens::v2"));
localStorage.removeItem(getLocalStorageKey("tokens::v3"));

const STORAGE_KEY = getLocalStorageKey("tokens::v4");

const loadTokens = (): Record<string, StorageToken> => {
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

const saveTokens = (tokens: Record<string, StorageToken>) => {
	try {
		localStorage.setItem(STORAGE_KEY, safeStringify(values(tokens)));
	} catch (err) {
		console.error("Failed to save tokens", err);
	}
};

const stop = logger.timer("initializing tokens store");
const tokensStoreData$ = new BehaviorSubject<Record<string, StorageToken>>(
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
	const current = tokensStoreData$.value;

	// Build a map of new tokens for quick lookup
	const newTokensMap = keyBy(
		tokens.filter((t) => t.id && t.type === type && t.chainId === chainId),
		"id",
	);

	// Track if anything changed
	let hasChanges = false;
	const newValue: Record<string, StorageToken> = {};

	// Keep tokens from other chains/types, check for removals
	for (const [id, token] of entries(current)) {
		if (token.chainId === chainId && token.type === type) {
			// This token is in the update scope - only keep if in new tokens
			if (newTokensMap[id]) {
				newValue[id] = newTokensMap[id];
				if (!isEqual(current[id], newTokensMap[id])) hasChanges = true;
			} else {
				hasChanges = true; // Token was removed
			}
		} else {
			// Keep tokens from other chains/types
			newValue[id] = token;
		}
	}

	// Add new tokens that weren't in current
	for (const [id, token] of entries(newTokensMap)) {
		if (!current[id]) {
			newValue[id] = token;
			hasChanges = true;
		}
	}

	// Only emit if something changed
	if (hasChanges) {
		tokensStoreData$.next(newValue);
	}

	stop();
};

// Cache the available chain IDs to avoid recomputing on every emission
let cachedAvailableChainIds: ChainId[] | null = null;
const getAvailableChainIds = () => {
	if (!cachedAvailableChainIds) {
		cachedAvailableChainIds = getChains().map((c) => c.id);
	}
	return cachedAvailableChainIds;
};

// Cache the last consolidated result to avoid recomputation when nothing changed
let lastStorageTokensMap: Record<string, StorageToken> | null = null;
let lastConsolidatedTokens: Record<string, Token> | null = null;

const consolidateTokens = (
	storageTokensMap: Record<string, StorageToken>,
): Record<string, Token> => {
	// Return cached result if input hasn't changed
	if (lastStorageTokensMap === storageTokensMap && lastConsolidatedTokens) {
		return lastConsolidatedTokens;
	}

	const stop = logger.timer("consolidate tokensStore$");
	const availableChainIds = getAvailableChainIds();

	const tokensMap: Record<string, Token> = {};
	for (const [id, token] of entries(storageTokensMap)) {
		if (availableChainIds.includes(token.chainId)) {
			tokensMap[id] = token as Token;
		}
	}

	// Cache the result
	lastStorageTokensMap = storageTokensMap;
	lastConsolidatedTokens = tokensMap;

	stop();
	return tokensMap;
};

// Store may contain incomplete information, such as for XC tokens whose symbol can only be found on the source chain
export const tokensStore$ = tokensStoreData$.pipe(
	distinctUntilChanged(isEqual),
	map(consolidateTokens),
	// The consolidateTokens function has internal caching, so this distinctUntilChanged
	// uses reference equality which is cheap when the cache hits
	distinctUntilChanged(),
	shareReplay(1),
);
