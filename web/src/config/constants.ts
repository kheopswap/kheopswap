import { ChainIdRelay } from "./chains";

export const DEV = import.meta.env.DEV;
export const DEV_IGNORE_STORAGE = import.meta.env.VITE_DEV_IGNORE_STORAGE;

export const APP_KEY = "kheopswap";
export const APP_FEE_ADDRESS = import.meta.env.VITE_APP_FEE_ADDRESS;
export const APP_FEE_PERCENT = Number(import.meta.env.VITE_APP_FEE_PERCENT);

export const DEFAULT_RELAY_ID: ChainIdRelay = "polkadot";

export const POOLS_CACHE_DURATION = 300_000;
export const TOKENS_CACHE_DURATION = 300_000;
export const STORAGE_QUERY_TIMEOUT = 30_000;
