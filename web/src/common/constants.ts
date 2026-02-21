export const DEV = import.meta.env.DEV;
export const DEV_IGNORE_STORAGE = import.meta.env.VITE_DEV_IGNORE_STORAGE;
export const DISABLE_LIGHT_CLIENTS =
	import.meta.env.VITE_DISABLE_LIGHT_CLIENTS === "true";

export const APP_KEY = "kheopswap";
export const APP_FEE_ADDRESS = import.meta.env.VITE_APP_FEE_ADDRESS;
export const APP_FEE_PERCENT = Number(import.meta.env.VITE_APP_FEE_PERCENT);

export const WALLET_CONNECT_PROJECT_ID = import.meta.env
	.VITE_WALLET_CONNECT_PROJECT_ID;

export const POOLS_CACHE_DURATION = 300_000;
export const TOKENS_CACHE_DURATION = 300_000;
export const STORAGE_QUERY_TIMEOUT = 30_000;
