import { setSetting } from "@kheopswap/settings";
import { APP_KEY } from "@kheopswap/utils";

const STORAGE_VERSION = 1;
const STORAGE_VERSION_KEY = `${APP_KEY}::storage_version`;

/**
 * Checks if the storage version has changed and clears localStorage if needed.
 * When STORAGE_VERSION in constants is incremented, all localStorage data
 * will be cleared on the next page load to prevent issues with stale data.
 */
const checkStorageVersion = () => {
	try {
		const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
		const currentVersion = String(STORAGE_VERSION);

		if (storedVersion !== currentVersion) {
			// Version mismatch - clear all localStorage
			localStorage.clear();

			// Store the new version
			localStorage.setItem(STORAGE_VERSION_KEY, currentVersion);

			console.info(
				`[kheopswap] Storage version changed from ${storedVersion ?? "none"} to ${currentVersion}. localStorage cleared.`,
			);
		}
	} catch (err) {
		// localStorage might be unavailable (e.g., private browsing in some browsers)
		console.warn("[kheopswap] Could not check storage version:", err);
	}
};

/**
 * Apply settings from URL query parameters.
 * After applying settings, the query string is removed from the URL to keep it clean.
 *
 * Supported query parameters:
 * - `light-clients=false` - Disable light clients (useful for testing/debugging)
 *
 * Example: http://localhost:5173/?light-clients=false#/polkadot/swap
 */
const applyUrlSettings = () => {
	const params = new URLSearchParams(window.location.search);

	// Track if any settings were applied
	let settingsApplied = false;

	// Handle light-clients parameter
	const lightClientsParam = params.get("light-clients");
	if (lightClientsParam !== null) {
		const enabled = lightClientsParam.toLowerCase() !== "false";
		setSetting("lightClients", enabled);
		settingsApplied = true;
	}

	// Clean up URL by removing query string if settings were applied
	if (settingsApplied && window.location.search) {
		const cleanUrl =
			window.location.origin + window.location.pathname + window.location.hash;
		window.history.replaceState(null, "", cleanUrl);
	}
};

/**
 * Run all startup initialization tasks.
 * This must be called synchronously at app startup, before React mounts
 * and before any other code that reads from localStorage or settings.
 *
 * Order matters:
 * 1. Check storage version (may clear localStorage)
 * 2. Apply URL settings (reads/writes to localStorage)
 */
const startup = () => {
	checkStorageVersion();
	applyUrlSettings();
};

// Self-executing: runs when this module is imported
startup();
