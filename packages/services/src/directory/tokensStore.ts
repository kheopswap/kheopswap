import {
	type ChainId,
	getChains,
	getNativeToken,
	type Token,
	type TokenId,
} from "@kheopswap/registry";
import { getLocalStorageKey, logger } from "@kheopswap/utils";
import {
	BehaviorSubject,
	debounceTime,
	distinctUntilChanged,
	interval,
	map,
	type Subscription,
	shareReplay,
} from "rxjs";
import type { LoadingStatus } from "../common";
import { getDirectoryTokens$ } from "../directory/service";
import { fetchTokensFromChain$, requestTokensFetch } from "../tokens/onchain";

const STORAGE_KEY = getLocalStorageKey("directory-tokens::v2");

// Polling intervals
const TOKEN_POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

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

// Initialize with cached data + native tokens from registry
const initializeTokens = (): Record<string, Token> => {
	const cached = loadFromCache();

	// Always ensure native tokens are present from registry
	for (const chain of getChains()) {
		const nativeToken = getNativeToken(chain.id);
		// Only add if not already in cache (cache might have better logo from directory)
		if (!cached[nativeToken.id]) {
			cached[nativeToken.id] = nativeToken;
		}
	}

	return cached;
};

const stop = logger.timer("initializing directory tokens store");
const tokensStoreData$ = new BehaviorSubject<Record<string, Token>>(
	initializeTokens(),
);
stop();

// Status tracking per chain
const statusByChain$ = new BehaviorSubject<Record<ChainId, LoadingStatus>>(
	{} as Record<ChainId, LoadingStatus>,
);

// Track which chains have been initialized
const initializedChains = new Set<ChainId>();
const chainSubscriptions = new Map<ChainId, Subscription>();
const pollingSubscriptions = new Map<ChainId, Subscription>();

// Track directory load completion for triggering on-chain fetch
const directoryLoadedChains = new Set<ChainId>();

/**
 * Merge on-chain tokens with existing tokens
 * - For existing tokens: update chain-derived fields (decimals, isSufficient)
 *   but preserve curated fields (name, symbol, logo, verified)
 * - For new tokens: add with verified: false, no logo
 */
const mergeOnChainTokens = (
	existing: Record<string, Token>,
	onChain: Token[],
	_chainId: ChainId,
): Record<string, Token> => {
	const result = { ...existing };

	for (const onChainToken of onChain) {
		const existingToken = result[onChainToken.id];

		if (existingToken) {
			// Update chain-derived fields, preserve curated fields
			result[onChainToken.id] = {
				...existingToken,
				decimals: onChainToken.decimals,
				isSufficient: onChainToken.isSufficient,
			} as Token;
		} else {
			// New token discovered on-chain
			result[onChainToken.id] = onChainToken;
		}
	}

	return result;
};

/**
 * Start on-chain polling for a chain
 * Polls every 15 minutes for new/updated tokens
 */
const startOnChainPolling = (chainId: ChainId): void => {
	if (pollingSubscriptions.has(chainId)) return;

	// Initial fetch after directory load
	const initialFetch = fetchTokensFromChain$(chainId).subscribe({
		next: (tokens) => {
			if (tokens.length > 0) {
				const currentTokens = tokensStoreData$.value;
				const merged = mergeOnChainTokens(currentTokens, tokens, chainId);
				tokensStoreData$.next(merged);
				logger.info(
					`On-chain token fetch for ${chainId}: ${tokens.length} tokens`,
				);
			}
		},
		error: (err) => {
			logger.warn(`On-chain token fetch failed for ${chainId}`, { err });
		},
	});

	// Set up polling interval
	const pollingSub = interval(TOKEN_POLL_INTERVAL_MS).subscribe(() => {
		fetchTokensFromChain$(chainId).subscribe({
			next: (tokens) => {
				if (tokens.length > 0) {
					const currentTokens = tokensStoreData$.value;
					const merged = mergeOnChainTokens(currentTokens, tokens, chainId);
					tokensStoreData$.next(merged);
					logger.debug(
						`On-chain token poll for ${chainId}: ${tokens.length} tokens`,
					);
				}
			},
			error: (err) => {
				logger.warn(`On-chain token poll failed for ${chainId}`, { err });
			},
		});
	});

	pollingSubscriptions.set(chainId, pollingSub);

	// Clean up initial fetch subscription
	setTimeout(() => initialFetch.unsubscribe(), 60000);
};

/**
 * Initialize directory token loading for a specific chain (lazy)
 * Data flow: localStorage (instant) → directory (override) → on-chain polling (merge new)
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

				// Still start on-chain polling even if directory fails
				if (!directoryLoadedChains.has(chainId)) {
					directoryLoadedChains.add(chainId);
					startOnChainPolling(chainId);
				}
				return;
			}

			// Update tokens store - directory replaces existing tokens for this chain
			const currentTokens = tokensStoreData$.value;
			const newTokens = { ...currentTokens };

			// Remove old tokens for this chain (except native which comes from registry)
			for (const tokenId of Object.keys(newTokens)) {
				if (
					newTokens[tokenId]?.chainId === chainId &&
					newTokens[tokenId]?.type !== "native"
				) {
					delete newTokens[tokenId];
				}
			}

			// Add directory tokens (they are authoritative for curated data)
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

			// Start on-chain polling after first directory load
			if (status === "loaded" && !directoryLoadedChains.has(chainId)) {
				directoryLoadedChains.add(chainId);
				startOnChainPolling(chainId);
			}
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

/**
 * Fetch missing tokens on-demand (called by pool store when discovering unknown tokens)
 * Uses batched fetching with 100ms debounce
 */
export const fetchMissingTokens = async (
	chainId: ChainId,
	tokenIds: TokenId[],
): Promise<void> => {
	const currentTokens = tokensStoreData$.value;
	const missingIds = tokenIds.filter((id) => !currentTokens[id]);

	if (missingIds.length === 0) return;

	logger.info(`Fetching ${missingIds.length} missing tokens for ${chainId}`);

	const tokens = await requestTokensFetch(chainId, missingIds);

	if (tokens.length > 0) {
		const updatedTokens = { ...tokensStoreData$.value };
		for (const token of tokens) {
			// Only add if still missing (could have been added by another fetch)
			if (!updatedTokens[token.id]) {
				updatedTokens[token.id] = token;
			}
		}
		tokensStoreData$.next(updatedTokens);
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
	shareReplay({ bufferSize: 1, refCount: true }),
);

// Export status by chain
export const directoryTokensStatusByChain$ = statusByChain$.asObservable();
