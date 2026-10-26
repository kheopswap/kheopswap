import { isEqual, keys, merge, pick } from "lodash-es";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";
import { getLocalStorageKey } from "../utils/getLocalStorageKey";
import { safeParse, safeStringify } from "../utils/serialization";

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

const getPersistedSettings = (): Settings => {
	try {
		const strSettings = localStorage.getItem(STORAGE_KEY);
		if (strSettings)
			return merge(
				{},
				DEFAULT_SETTINGS,
				pick(safeParse<Partial<Settings>>(strSettings), keys(DEFAULT_SETTINGS)),
			);
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
