const env = import.meta.env ?? {};

export const DEV = env.DEV;
export const DEV_IGNORE_STORAGE = env.VITE_DEV_IGNORE_STORAGE;

export const APP_KEY = "kheopswap"; // TODO do something about the one in utils

/**
 * Increment this version when deploying changes that require localStorage to be cleared.
 * When the app loads, it checks this version against the stored version.
 * If they differ, localStorage is cleared to prevent issues with stale data.
 */
export const STORAGE_VERSION = 1;
export const APP_FEE_ADDRESS =
	"5FfAKNMrDZWBQ3zcRj8UfszfG7EFutCK6kUgNqJ7NFhNMCTV";
export const APP_FEE_PERCENT = 0.3;

export const WALLET_CONNECT_PROJECT_ID = "67b8f4b678ad8d5d9dc3a564e4057dbb";

export const USE_CHOPSTICKS = !!env.VITE_USE_CHOPSTICKS;

export const GITHUB_BRANCH = "feat/directory";

export const DEFAULT_RELAY_ID = "polkadot";

export const POOLS_CACHE_DURATION = 300_000;
export const TOKENS_CACHE_DURATION = 300_000;
export const STORAGE_QUERY_TIMEOUT = USE_CHOPSTICKS ? 60_000 : 30_000;

/** Polling interval for balance subscriptions in "poll" mode (30 seconds) */
export const BALANCE_POLL_INTERVAL = 30_000;
