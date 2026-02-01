import { createStore, del, entries, get, set } from "idb-keyval";

const STORE_NAME = "kheopswap-metadata-cache";
const DB_NAME = "kheopswap";

// Separate IndexedDB store for metadata to avoid conflicts with other data
const metadataStore = createStore(DB_NAME, STORE_NAME);

interface CachedMetadata {
	metadata: Uint8Array;
	timestamp: number;
}

/**
 * Maximum number of cached metadata entries to keep.
 * We support 4 chains (pah, kah, wah, pasah), so we keep at most 4 entries.
 */
const MAX_CACHE_ENTRIES = 4;

/**
 * Get cached metadata for a given codeHash from IndexedDB.
 *
 * @param codeHash - The hash of the `:code` storage entry (runtime code hash)
 * @returns The cached metadata bytes, or null if not found
 */
export const getCachedMetadata = async (
	codeHash: string,
): Promise<Uint8Array | null> => {
	try {
		const cached = await get<CachedMetadata>(codeHash, metadataStore);

		if (!cached) {
			console.debug("[metadataCache] cache MISS for codeHash:", codeHash);
			return null;
		}

		console.debug("[metadataCache] cache HIT for codeHash:", codeHash);
		return cached.metadata;
	} catch (error) {
		console.warn("Failed to get cached metadata:", error);
		return null;
	}
};

/**
 * Remove oldest cache entries if we exceed the maximum allowed.
 */
const pruneOldestEntries = async (): Promise<void> => {
	try {
		const allEntries = await entries<string, CachedMetadata>(metadataStore);

		if (allEntries.length <= MAX_CACHE_ENTRIES) return;

		// Sort by timestamp ascending (oldest first)
		const sorted = allEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);

		// Delete oldest entries until we're at or below the limit
		const entriesToDelete = sorted.slice(
			0,
			allEntries.length - MAX_CACHE_ENTRIES,
		);

		await Promise.all(entriesToDelete.map(([key]) => del(key, metadataStore)));
	} catch (error) {
		console.warn("Failed to prune old metadata cache entries:", error);
	}
};

/**
 * Store metadata in IndexedDB cache with a timestamp.
 * If there are more than 4 entries, the oldest ones are deleted.
 *
 * @param codeHash - The hash of the `:code` storage entry (runtime code hash)
 * @param metadata - The raw metadata bytes to cache
 */
export const setCachedMetadata = (
	codeHash: string,
	metadata: Uint8Array,
): void => {
	const entry: CachedMetadata = {
		metadata,
		timestamp: Date.now(),
	};

	set(codeHash, entry, metadataStore)
		.then(() => pruneOldestEntries())
		.catch((error) => {
			console.warn("Failed to cache metadata:", error);
		});
};
