// Environment accessor that works in both Vite and Node.js
const env =
	(import.meta as { env?: Record<string, string | boolean | undefined> }).env ??
	(typeof process !== "undefined"
		? (process.env as Record<string, string | boolean | undefined>)
		: {});

export const DEV = env.DEV ?? env.NODE_ENV !== "production";
export const DEV_IGNORE_STORAGE = env.VITE_DEV_IGNORE_STORAGE;

export const APP_KEY = "kheopswap"; // TODO do something about the one in utils
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
