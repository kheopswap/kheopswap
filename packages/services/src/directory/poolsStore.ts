import type { ChainId } from "@kheopswap/registry";
import { getLocalStorageKey, logger } from "@kheopswap/utils";
import { BehaviorSubject, debounceTime, type Subscription } from "rxjs";
import type { LoadingStatus } from "../common";
import { getDirectoryPools$ } from "../directory/service";
import type { Pool } from "../pools/types";

const STORAGE_KEY = getLocalStorageKey("directory-pools::v1");

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
export const directoryPoolsStore$ = new BehaviorSubject<Pool[]>(
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
 * Initialize directory pool loading for a specific chain (lazy)
 * Called automatically when pools for a chain are first requested
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
				return;
			}

			// Update pools store
			const currentPools = directoryPoolsStore$.value;

			// Remove old pools for this chain and add new ones
			const otherChainPools = currentPools.filter((p) => p.chainId !== chainId);
			const newPools = [...otherChainPools, ...pools];

			directoryPoolsStore$.next(newPools);

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
directoryPoolsStore$.pipe(debounceTime(1_000)).subscribe(saveToCache);

// Export status by chain
export const directoryPoolsStatusByChain$ = statusByChain$.asObservable();
