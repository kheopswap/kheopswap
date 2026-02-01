import type { ChainId, TokenId } from "@kheopswap/registry";
import { getLocalStorageKey, logger } from "@kheopswap/utils";
import {
	BehaviorSubject,
	debounceTime,
	interval,
	type Subscription,
} from "rxjs";
import type { LoadingStatus } from "../common";
import { getDirectoryPools$ } from "../directory/service";
import { fetchMissingTokens } from "../directory/tokensStore";
import { fetchPoolsFromChain } from "../pools/onchain";
import type { Pool } from "../pools/types";

const STORAGE_KEY = getLocalStorageKey("directory-pools::v2");

// Polling intervals
const POOL_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type CachedPoolsData = {
	pools: Pool[];
	lastUpdated: number;
};

/**
 * Load cached pools from localStorage
 */
const loadFromCache = (): Pool[] => {
	try {
		const cached = localStorage.getItem(STORAGE_KEY);
		if (!cached) return [];

		const parsed = JSON.parse(cached) as CachedPoolsData;
		return parsed.pools;
	} catch (err) {
		logger.warn("Failed to load directory pools cache", { err });
		return [];
	}
};

/**
 * Save pools to localStorage
 */
const saveToCache = (pools: Pool[]): void => {
	try {
		const cached: CachedPoolsData = {
			pools,
			lastUpdated: Date.now(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
	} catch (err) {
		logger.warn("Failed to save directory pools cache", { err });
	}
};

// Initialize with cached data
const stop = logger.timer("initializing directory pools store");
const poolsStoreData$ = new BehaviorSubject<Pool[]>(loadFromCache());
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

// Track known token IDs per chain to detect missing tokens
const knownTokenIds = new Map<ChainId, Set<TokenId>>();

/**
 * Check for missing tokens and trigger on-demand fetch
 */
const checkAndFetchMissingTokens = async (
	chainId: ChainId,
	referencedTokenIds: TokenId[],
): Promise<void> => {
	// Get current known tokens for this chain
	let known = knownTokenIds.get(chainId);
	if (!known) {
		known = new Set();
		knownTokenIds.set(chainId, known);
	}

	// Find tokens we haven't seen before
	const newTokenIds = referencedTokenIds.filter((id) => !known.has(id));

	if (newTokenIds.length > 0) {
		// Add to known set
		for (const id of newTokenIds) {
			known.add(id);
		}

		// Trigger on-demand token fetch for any missing tokens
		await fetchMissingTokens(chainId, newTokenIds);
	}
};

/**
 * Merge on-chain pools with existing pools
 * - Add new pools
 * - Update existing pool data (owner changes are rare but possible)
 */
const mergeOnChainPools = (
	existing: Pool[],
	onChain: Pool[],
	chainId: ChainId,
): Pool[] => {
	// Create a map of existing pools by poolAssetId for quick lookup
	const existingMap = new Map(
		existing
			.filter((p) => p.chainId === chainId)
			.map((p) => [p.poolAssetId, p]),
	);

	// Keep pools from other chains
	const otherChainPools = existing.filter((p) => p.chainId !== chainId);

	// Merge on-chain pools (they take precedence for this chain)
	const mergedChainPools = onChain.map((onChainPool) => {
		const existingPool = existingMap.get(onChainPool.poolAssetId);
		// On-chain data wins, but we could preserve any directory-specific fields here if needed
		return existingPool ? { ...existingPool, ...onChainPool } : onChainPool;
	});

	return [...otherChainPools, ...mergedChainPools];
};

/**
 * Start on-chain polling for a chain
 * Polls every 5 minutes for new/updated pools
 */
const startOnChainPolling = (chainId: ChainId): void => {
	if (pollingSubscriptions.has(chainId)) return;

	// Initial fetch after directory load
	fetchPoolsFromChain(chainId)
		.then(async ({ pools, referencedTokenIds }) => {
			if (pools.length > 0) {
				const currentPools = poolsStoreData$.value;
				const merged = mergeOnChainPools(currentPools, pools, chainId);
				poolsStoreData$.next(merged);
				logger.info(
					`On-chain pool fetch for ${chainId}: ${pools.length} pools`,
				);

				// Check for missing tokens
				await checkAndFetchMissingTokens(chainId, referencedTokenIds);
			}
		})
		.catch((err) => {
			logger.warn(`On-chain pool fetch failed for ${chainId}`, { err });
		});

	// Set up polling interval
	const pollingSub = interval(POOL_POLL_INTERVAL_MS).subscribe(() => {
		fetchPoolsFromChain(chainId)
			.then(async ({ pools, referencedTokenIds }) => {
				if (pools.length > 0) {
					const currentPools = poolsStoreData$.value;
					const merged = mergeOnChainPools(currentPools, pools, chainId);
					poolsStoreData$.next(merged);
					logger.debug(
						`On-chain pool poll for ${chainId}: ${pools.length} pools`,
					);

					// Check for missing tokens
					await checkAndFetchMissingTokens(chainId, referencedTokenIds);
				}
			})
			.catch((err) => {
				logger.warn(`On-chain pool poll failed for ${chainId}`, { err });
			});
	});

	pollingSubscriptions.set(chainId, pollingSub);
};

/**
 * Initialize directory pool loading for a specific chain (lazy)
 * Data flow: localStorage (instant) → directory (override) → on-chain polling (merge new)
 */
const initializeChainPools = (chainId: ChainId): void => {
	if (initializedChains.has(chainId)) return;
	initializedChains.add(chainId);

	// Set initial loading status
	statusByChain$.next({
		...statusByChain$.value,
		[chainId]: "loading",
	});

	const subscription = getDirectoryPools$(chainId).subscribe({
		next: ({ status, pools, error }) => {
			if (error && pools.length === 0) {
				logger.error(`Failed to load directory pools for ${chainId}`, {
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

			// Update pools store - directory replaces existing pools for this chain
			const currentPools = poolsStoreData$.value;

			// Remove old pools for this chain and add new ones
			const otherChainPools = currentPools.filter((p) => p.chainId !== chainId);
			const newPools = [...otherChainPools, ...pools];

			poolsStoreData$.next(newPools);

			// Track referenced token IDs from directory pools
			const referencedTokenIds = pools.flatMap((p) => p.tokenIds);
			checkAndFetchMissingTokens(chainId, referencedTokenIds);

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
			logger.error(`Directory pools subscription error for ${chainId}`, {
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
 * Ensure pools are loaded for the specified chains
 * Call this when the active chain changes
 */
export const ensureDirectoryPools = (chainIds: ChainId[]): void => {
	for (const chainId of chainIds) {
		initializeChainPools(chainId);
	}
};

// Save to cache when pools change (debounced)
poolsStoreData$.pipe(debounceTime(1_000)).subscribe(saveToCache);

// Export pools store
export const directoryPoolsStore$ = poolsStoreData$.asObservable();

// Export status by chain
export const directoryPoolsStatusByChain$ = statusByChain$.asObservable();
