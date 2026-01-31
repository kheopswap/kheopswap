import { setSetting } from "@kheopswap/settings";

/**
 * Apply settings from URL query parameters.
 * This must be called synchronously at app startup, before any connections are made.
 * After applying settings, the query string is removed from the URL to keep it clean.
 *
 * Supported query parameters:
 * - `light-clients=false` - Disable light clients (useful for testing/debugging)
 *
 * Example: http://localhost:5173/?light-clients=false#/polkadot/swap
 */
export const applyUrlSettings = () => {
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
