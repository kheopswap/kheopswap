import { getLocalStorageKey, safeParse, safeStringify } from "@kheopswap/utils";
import { isEqual, merge } from "lodash";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";

export type Settings = {
	defaultAccountId: string | null;
	relayId: string;
	lightClients: boolean;
	slippage: number;
	lpSlippage: number;
	feeTokens: Record<string, string>;
};

const DEFAULT_SETTINGS: Settings = {
	defaultAccountId: null,
	relayId: "polkadot",
	lightClients: true,
	slippage: 0.005,
	lpSlippage: 0.005,
	feeTokens: {},
};

const STORAGE_KEY = getLocalStorageKey("settings");

const getPersistedSettings = () => {
	try {
		const strSettings = localStorage.getItem(STORAGE_KEY);
		const settings = strSettings
			? safeParse<Settings>(strSettings)
			: DEFAULT_SETTINGS;

		// clean up old settings
		if (strSettings)
			for (const key of Object.keys(settings))
				if (!(key in DEFAULT_SETTINGS)) {
					// biome-ignore lint/suspicious/noExplicitAny: legacy
					delete (settings as any)[key];
				}

		if (strSettings) return merge(DEFAULT_SETTINGS, settings as Settings);
	} catch (err) {
		console.error("Error loading settings", { err });
	}
	return DEFAULT_SETTINGS;
};

const settingsStore$ = new BehaviorSubject<Settings>(getPersistedSettings());

settingsStore$.subscribe((settings) => {
	localStorage.setItem(STORAGE_KEY, safeStringify(settings));
});

export const setSetting = <Key extends keyof Settings, Value = Settings[Key]>(
	key: Key,
	value: Value,
) => {
	if (settingsStore$.value[key] !== value)
		settingsStore$.next({ ...settingsStore$.value, [key]: value });
};

export const getSetting = <Key extends keyof Settings, Value = Settings[Key]>(
	key: Key,
): Value => {
	return settingsStore$.value[key] as Value;
};

export const getSetting$ = <Key extends keyof Settings, Value = Settings[Key]>(
	key: Key,
) => {
	return settingsStore$.pipe(
		map((s) => s[key] as Value),
		distinctUntilChanged<Value>(isEqual),
	);
};
