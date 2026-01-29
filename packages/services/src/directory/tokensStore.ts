import { type ChainId, getChains, type Token } from "@kheopswap/registry";
import { getLocalStorageKey, logger } from "@kheopswap/utils";
import {
	BehaviorSubject,
	debounceTime,
	distinctUntilChanged,
	map,
	type Subscription,
	shareReplay,
} from "rxjs";
import type { LoadingStatus } from "../common";
import { getDirectoryTokens$ } from "../directory/service";

const STORAGE_KEY = getLocalStorageKey("directory-tokens::v1");

type CachedTokensData = {
	tokens: Record<string, Token>;
	lastUpdated: number;
};

/**
 * Load cached tokens from localStorage
 */
const loadFromCache = (): Record<string, Token> => {
	try {
		const cached = localStorage.getItem(STORAGE_KEY);
		if (!cached) return {};

		const parsed = JSON.parse(cached) as CachedTokensData;
		return parsed.tokens;
	} catch (err) {
		logger.warn("Failed to load directory tokens cache", { err });
		return {};
	}
};

/**
 * Save tokens to localStorage
 */
const saveToCache = (tokens: Record<string, Token>): void => {
	try {
		const cached: CachedTokensData = {
			tokens,
			lastUpdated: Date.now(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
	} catch (err) {
		logger.warn("Failed to save directory tokens cache", { err });
	}
};

// Initialize with cached data
const stop = logger.timer("initializing directory tokens store");
const tokensStoreData$ = new BehaviorSubject<Record<string, Token>>(
	loadFromCache(),
);
stop();

// Status tracking per chain
const statusByChain$ = new BehaviorSubject<Record<ChainId, LoadingStatus>>(
	{} as Record<ChainId, LoadingStatus>,
);

// Track which chains have been initialized
const initializedChains = new Set<ChainId>();
const chainSubscriptions = new Map<ChainId, Subscription>();

/**
 * Initialize directory token loading for a specific chain (lazy)
 * Called automatically when tokens for a chain are first requested
 */
const initializeChainTokens = (chainId: ChainId): void => {
	if (initializedChains.has(chainId)) return;
	initializedChains.add(chainId);

	// Set initial loading status
	statusByChain$.next({
		...statusByChain$.value,
		[chainId]: "loading",
	});

	const subscription = getDirectoryTokens$(chainId).subscribe({
		next: ({ status, tokens, error }) => {
			if (error && tokens.length === 0) {
				logger.error(`Failed to load directory tokens for ${chainId}`, {
					error,
				});
				statusByChain$.next({
					...statusByChain$.value,
					[chainId]: "stale",
				});
				return;
			}

			// Update tokens store
			const currentTokens = tokensStoreData$.value;
			const newTokens = { ...currentTokens };

			// Remove old tokens for this chain
			for (const tokenId of Object.keys(newTokens)) {
				if (newTokens[tokenId]?.chainId === chainId) {
					delete newTokens[tokenId];
				}
			}

			// Add new tokens
			for (const token of tokens) {
				newTokens[token.id] = token;
			}

			tokensStoreData$.next(newTokens);

			// Update status
			const loadingStatus: LoadingStatus =
				status === "loaded"
					? "loaded"
					: status === "error"
						? "stale"
						: "loading";
			statusByChain$.next({
				...statusByChain$.value,
				[chainId]: loadingStatus,
			});
		},
		error: (err) => {
			logger.error(`Directory tokens subscription error for ${chainId}`, {
				err,
			});
			statusByChain$.next({
				...statusByChain$.value,
				[chainId]: "stale",
			});
		},
	});

	chainSubscriptions.set(chainId, subscription);
};

/**
 * Ensure tokens are loaded for the specified chains
 * Call this when the active chain changes
 */
export const ensureDirectoryTokens = (chainIds: ChainId[]): void => {
	for (const chainId of chainIds) {
		initializeChainTokens(chainId);
	}
};

// Save to cache when tokens change (debounced)
tokensStoreData$.pipe(debounceTime(1_000)).subscribe(saveToCache);

// Cache the available chain IDs to avoid recomputing on every emission
let cachedAvailableChainIds: ChainId[] | null = null;
const getAvailableChainIds = () => {
	if (!cachedAvailableChainIds) {
		cachedAvailableChainIds = getChains().map((c) => c.id);
	}
	return cachedAvailableChainIds;
};

// Cache the last consolidated result to avoid recomputation when nothing changed
let lastTokensMap: Record<string, Token> | null = null;
let lastConsolidatedTokens: Record<string, Token> | null = null;

const consolidateTokens = (
	tokensMap: Record<string, Token>,
): Record<string, Token> => {
	// Return cached result if input hasn't changed
	if (lastTokensMap === tokensMap && lastConsolidatedTokens) {
		return lastConsolidatedTokens;
	}

	const stop = logger.timer("consolidate directory tokensStore$");
	const availableChainIds = getAvailableChainIds();

	const result: Record<string, Token> = {};
	for (const [id, token] of Object.entries(tokensMap)) {
		if (availableChainIds.includes(token.chainId)) {
			result[id] = token;
		}
	}

	// Cache the result
	lastTokensMap = tokensMap;
	lastConsolidatedTokens = result;

	stop();
	return result;
};

// Export consolidated tokens store
export const directoryTokensStore$ = tokensStoreData$.pipe(
	map(consolidateTokens),
	distinctUntilChanged(),
	shareReplay(1),
);

// Export status by chain
export const directoryTokensStatusByChain$ = statusByChain$.asObservable();
