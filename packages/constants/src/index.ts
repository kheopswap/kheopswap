export const DEV = import.meta.env.DEV;
export const DEV_IGNORE_STORAGE = import.meta.env.VITE_DEV_IGNORE_STORAGE;

export const APP_KEY = "kheopswap"; // TODO do something about the one in utils
export const APP_FEE_ADDRESS = import.meta.env.VITE_APP_FEE_ADDRESS;
export const APP_FEE_PERCENT = Number(import.meta.env.VITE_APP_FEE_PERCENT);

export const WALLET_CONNECT_PROJECT_ID = import.meta.env
	.VITE_WALLET_CONNECT_PROJECT_ID;

export const USE_CHOPSTICKS = !!import.meta.env.VITE_USE_CHOPSTICKS;

export const DEFAULT_RELAY_ID = "polkadot";

export const POOLS_CACHE_DURATION = 300_000;
export const TOKENS_CACHE_DURATION = 300_000;
export const STORAGE_QUERY_TIMEOUT = USE_CHOPSTICKS ? 120_000 : 30_000;

export const STABLE_ASSET_ID = "asset::pah::1337";
