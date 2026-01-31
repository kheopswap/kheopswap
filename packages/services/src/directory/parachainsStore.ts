import { GITHUB_BRANCH } from "@kheopswap/constants";
import type { Parachain, RelayId } from "@kheopswap/registry";
import {
	getLocalStorageKey,
	logger,
	toStaticallyCdnUrl,
} from "@kheopswap/utils";
import { BehaviorSubject, map, shareReplay } from "rxjs";

const DIRECTORY_RAW_URL = `https://raw.githubusercontent.com/kheopswap/kheopswap/${GITHUB_BRANCH}/directory/data/v1`;

const STORAGE_KEY = getLocalStorageKey("directory::v1::parachains");

export type ParachainsState = {
	status: "loading" | "loaded" | "error";
	parachains: Parachain[];
	error: Error | null;
};

type CachedParachainsData = {
	parachains: Parachain[];
	fetchedAt: number;
};

/**
 * Load cached parachains from localStorage
 */
const loadFromCache = (): Parachain[] | null => {
	try {
		const cached = localStorage.getItem(STORAGE_KEY);
		if (!cached) return null;

		const parsed = JSON.parse(cached) as CachedParachainsData;
		return parsed.parachains;
	} catch (err) {
		logger.warn("Failed to load parachains cache", { err });
		return null;
	}
};

/**
 * Save parachains to localStorage
 */
const saveToCache = (parachains: Parachain[]): void => {
	try {
		const cached: CachedParachainsData = {
			parachains,
			fetchedAt: Date.now(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
	} catch (err) {
		logger.warn("Failed to save parachains cache", { err });
	}
};

/**
 * Fetch parachains from GitHub via Statically CDN with fallback to raw GitHub
 */
const fetchFromGitHub = async (): Promise<Parachain[]> => {
	const rawUrl = `${DIRECTORY_RAW_URL}/parachains.json`;
	const cdnUrl = toStaticallyCdnUrl(rawUrl);

	// Try Statically CDN first
	if (cdnUrl) {
		try {
			const response = await fetch(cdnUrl);
			if (response.ok) {
				return response.json();
			}
			logger.warn(
				"Statically CDN failed for parachains, falling back to raw GitHub",
			);
		} catch (err) {
			logger.warn(
				"Statically CDN error for parachains, falling back to raw GitHub",
				{ err },
			);
		}
	}

	// Fallback to raw GitHub
	const response = await fetch(rawUrl);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch parachains: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
};

// Store for parachains state
const parachainsStore = new BehaviorSubject<ParachainsState>({
	status: "loading",
	parachains: loadFromCache() ?? [],
	error: null,
});

// Track if we've started fetching
let fetchStarted = false;

/**
 * Start fetching parachains from GitHub
 */
const startFetch = async (): Promise<void> => {
	if (fetchStarted) return;
	fetchStarted = true;

	try {
		const parachains = await fetchFromGitHub();
		saveToCache(parachains);
		parachainsStore.next({
			status: "loaded",
			parachains,
			error: null,
		});
	} catch (err) {
		logger.error("Failed to fetch parachains", { err });
		parachainsStore.next({
			...parachainsStore.value,
			status: "error",
			error: err instanceof Error ? err : new Error(String(err)),
		});
	}
};

/**
 * Observable of parachains state
 */
export const parachainsStore$ = parachainsStore.asObservable();

/**
 * Observable of just the parachains array
 */
export const parachains$ = parachainsStore$.pipe(
	map((state) => state.parachains),
	shareReplay(1),
);

/**
 * Ensure parachains data is being fetched
 */
export const ensureParachains = (): void => {
	startFetch();
};

/**
 * Get a parachain by relay and paraId
 */
export const getParachainByParaId = (
	parachains: Parachain[],
	relay: RelayId | null,
	paraId: number | string | bigint,
): Parachain | undefined => {
	return parachains.find(
		(p) => p.relay === relay && p.paraId === Number(paraId),
	);
};

/**
 * Get parachain name with fallback
 */
export const getParachainName = (
	parachains: Parachain[],
	relay: RelayId | null,
	paraId: number | string | bigint,
): string => {
	const parachain = getParachainByParaId(parachains, relay, paraId);
	return parachain?.name ?? `Parachain ${paraId}`;
};
