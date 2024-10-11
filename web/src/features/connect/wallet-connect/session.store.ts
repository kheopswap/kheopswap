import { getLocalStorageKey, logger } from "@kheopswap/utils";
import type { SessionTypes } from "@walletconnect/types";
import { BehaviorSubject, debounceTime, tap } from "rxjs";
import { DEV_IGNORE_STORAGE } from "src/config/constants";

const STORAGE_KEY = getLocalStorageKey("wallet-connect-session");

const load = (): SessionTypes.Struct | null => {
	if (DEV_IGNORE_STORAGE) return null;

	try {
		const strSession = localStorage.getItem(STORAGE_KEY);
		return strSession ? JSON.parse(strSession) : null;
	} catch (err) {
		console.error("[Wallet Connnect] Failed to load session", err);
		return null;
	}
};

const save = (session: SessionTypes.Struct | null) => {
	try {
		if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		else localStorage.removeItem(STORAGE_KEY);
	} catch (err) {
		console.error("[Wallet Connect] Failed to save session", err);
		localStorage.removeItem(STORAGE_KEY);
	}
};

export const wcSession$ = new BehaviorSubject<SessionTypes.Struct | null>(
	load(),
);

// save after updates
wcSession$
	.pipe(
		tap((session) => {
			logger.debug("[Wallet Connect] session updated", { session });
		}),
		debounceTime(500),
	)
	.subscribe(save);
