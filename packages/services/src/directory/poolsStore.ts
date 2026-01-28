import { type ChainId, getChains } from "@kheopswap/registry";
import { getLocalStorageKey, logger } from "@kheopswap/utils";
import { BehaviorSubject, debounceTime } from "rxjs";
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

/**
 * Initialize directory pool loading for all chains
 * This should be called once on app startup
 */
export const initializeDirectoryPools = (): void => {
	const chains = getChains();

	// Initialize status for all chains
	const initialStatus = {} as Record<ChainId, LoadingStatus>;
	for (const chain of chains) {
		initialStatus[chain.id] = "loading";
	}
	statusByChain$.next(initialStatus);

	// Subscribe to directory data for each chain
	for (const chain of chains) {
		getDirectoryPools$(chain.id).subscribe({
			next: ({ status, pools, error }) => {
				if (error && pools.length === 0) {
					// Error with no cached data
					logger.error(`Failed to load directory pools for ${chain.id}`, {
						error,
					});
					statusByChain$.next({
						...statusByChain$.value,
						[chain.id]: "stale",
					});
					return;
				}

				// Update pools store
				const currentPools = directoryPoolsStore$.value;

				// Remove old pools for this chain and add new ones
				const otherChainPools = currentPools.filter(
					(p) => p.chainId !== chain.id,
				);
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
					[chain.id]: loadingStatus,
				});
			},
			error: (err) => {
				logger.error(`Directory pools subscription error for ${chain.id}`, {
					err,
				});
				statusByChain$.next({
					...statusByChain$.value,
					[chain.id]: "stale",
				});
			},
		});
	}
};

// Save to cache when pools change (debounced)
directoryPoolsStore$.pipe(debounceTime(1_000)).subscribe(saveToCache);

// Export status by chain
export const directoryPoolsStatusByChain$ = statusByChain$.asObservable();
