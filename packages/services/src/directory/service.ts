import { GITHUB_BRANCH } from "@kheopswap/constants";
import type { ChainId } from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	toStaticallyCdnUrl,
} from "@kheopswap/utils";
import { BehaviorSubject, map, shareReplay } from "rxjs";
import type { DirectoryChainData, DirectoryState } from "./types";

const DIRECTORY_RAW_URL = `https://raw.githubusercontent.com/kheopswap/kheopswap/${GITHUB_BRANCH}/directory/data/v1`;

const getStorageKey = (chainId: ChainId) =>
	getLocalStorageKey(`directory::v1::${chainId}`);

type CachedDirectoryData = {
	data: DirectoryChainData;
	fetchedAt: number;
};

/**
 * Load cached directory data from localStorage
 */
const loadFromCache = (chainId: ChainId): DirectoryChainData | null => {
	try {
		const key = getStorageKey(chainId);
		const cached = localStorage.getItem(key);
		if (!cached) return null;

		const parsed = JSON.parse(cached) as CachedDirectoryData;
		return parsed.data;
	} catch (err) {
		logger.warn(`Failed to load directory cache for ${chainId}`, { err });
		return null;
	}
};

/**
 * Save directory data to localStorage
 */
const saveToCache = (chainId: ChainId, data: DirectoryChainData): void => {
	try {
		const key = getStorageKey(chainId);
		const cached: CachedDirectoryData = {
			data,
			fetchedAt: Date.now(),
		};
		localStorage.setItem(key, JSON.stringify(cached));
	} catch (err) {
		logger.warn(`Failed to save directory cache for ${chainId}`, { err });
	}
};

/**
 * Fetch directory data from GitHub via Statically CDN with fallback to raw GitHub
 */
const fetchFromGitHub = async (
	chainId: ChainId,
): Promise<DirectoryChainData> => {
	const rawUrl = `${DIRECTORY_RAW_URL}/${chainId}.json`;
	const cdnUrl = toStaticallyCdnUrl(rawUrl);

	// Try Statically CDN first
	if (cdnUrl) {
		try {
			const response = await fetch(cdnUrl);
			if (response.ok) {
				return response.json();
			}
			logger.warn(
				`Statically CDN failed for ${chainId}, falling back to raw GitHub`,
			);
		} catch (err) {
			logger.warn(
				`Statically CDN error for ${chainId}, falling back to raw GitHub`,
				{ err },
			);
		}
	}

	// Fallback to raw GitHub
	const response = await fetch(rawUrl);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch directory data for ${chainId}: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
};

/**
 * Check if data has changed by comparing generatedAt timestamps
 */
const hasDataChanged = (
	cached: DirectoryChainData | null,
	fetched: DirectoryChainData,
): boolean => {
	if (!cached) return true;
	return cached.generatedAt !== fetched.generatedAt;
};

// Store for directory state per chain
const directoryStores = new Map<ChainId, BehaviorSubject<DirectoryState>>();

const getDirectoryStore = (
	chainId: ChainId,
): BehaviorSubject<DirectoryState> => {
	let store = directoryStores.get(chainId);
	if (!store) {
		const cachedData = loadFromCache(chainId);
		store = new BehaviorSubject<DirectoryState>({
			status: cachedData ? "loaded" : "loading",
			data: cachedData,
			error: null,
			lastUpdated: cachedData ? Date.now() : null,
		});
		directoryStores.set(chainId, store);
	}
	return store;
};

// Track ongoing fetch promises to avoid duplicate requests
const fetchPromises = new Map<ChainId, Promise<void>>();

/**
 * Fetch directory data with stale-while-revalidate pattern
 * - If cache exists, emit immediately and fetch in background
 * - If no cache, fetch and wait for result
 * - On fetch success, update cache and emit if data changed
 * - On fetch failure with no cache, emit error
 */
export const fetchDirectoryData = async (chainId: ChainId): Promise<void> => {
	const store = getDirectoryStore(chainId);
	const currentState = store.value;

	// If already fetching, return existing promise
	const existingPromise = fetchPromises.get(chainId);
	if (existingPromise) {
		return existingPromise;
	}

	const doFetch = async (): Promise<void> => {
		try {
			const stop = logger.timer(`fetchDirectoryData(${chainId})`);
			const fetched = await fetchFromGitHub(chainId);
			stop();

			// Check if data changed
			if (hasDataChanged(currentState.data, fetched)) {
				saveToCache(chainId, fetched);
				store.next({
					status: "loaded",
					data: fetched,
					error: null,
					lastUpdated: Date.now(),
				});
				logger.info(`Directory data updated for ${chainId}`, {
					generatedAt: fetched.generatedAt,
					tokenCount: fetched.tokens.length,
					poolCount: fetched.pools.length,
				});
			} else {
				// Data hasn't changed, just update status if it was loading
				if (currentState.status === "loading") {
					store.next({
						...currentState,
						status: "loaded",
						lastUpdated: Date.now(),
					});
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			logger.error(`Failed to fetch directory data for ${chainId}`, { err });

			// If we have cached data, keep it and log warning
			// If no cached data, emit error state
			if (!currentState.data) {
				store.next({
					status: "error",
					data: null,
					error: errorMessage,
					lastUpdated: null,
				});
			}
		} finally {
			fetchPromises.delete(chainId);
		}
	};

	const promise = doFetch();
	fetchPromises.set(chainId, promise);
	return promise;
};

/**
 * Get directory state observable for a chain
 * Automatically triggers fetch on first subscription
 */
export const getDirectoryState$ = (chainId: ChainId) => {
	const store = getDirectoryStore(chainId);

	// Trigger fetch (stale-while-revalidate)
	fetchDirectoryData(chainId);

	return store.asObservable().pipe(shareReplay(1));
};

/**
 * Get directory tokens for a chain
 */
export const getDirectoryTokens$ = (chainId: ChainId) => {
	return getDirectoryState$(chainId).pipe(
		map((state) => ({
			status: state.status,
			tokens: state.data?.tokens ?? [],
			error: state.error,
		})),
		shareReplay(1),
	);
};

/**
 * Get directory pools for a chain
 */
export const getDirectoryPools$ = (chainId: ChainId) => {
	return getDirectoryState$(chainId).pipe(
		map((state) => ({
			status: state.status,
			pools: state.data?.pools ?? [],
			error: state.error,
		})),
		shareReplay(1),
	);
};

/**
 * Force refresh directory data for a chain
 */
export const refreshDirectoryData = (chainId: ChainId): Promise<void> => {
	return fetchDirectoryData(chainId);
};

/**
 * Clear directory cache for a chain
 */
export const clearDirectoryCache = (chainId: ChainId): void => {
	try {
		const key = getStorageKey(chainId);
		localStorage.removeItem(key);

		const store = directoryStores.get(chainId);
		if (store) {
			store.next({
				status: "loading",
				data: null,
				error: null,
				lastUpdated: null,
			});
		}
	} catch (err) {
		logger.warn(`Failed to clear directory cache for ${chainId}`, { err });
	}
};
