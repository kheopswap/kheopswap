import { getSetting$, type Settings, setSetting } from "@kheopswap/settings";
import { bind } from "@react-rxjs/core";
import { type SetStateAction, useCallback } from "react";

// Create a bound hook for each setting at module level
// bind() with a factory function handles parameterized observables
// The default value factory receives the same arguments as the observable factory
const [useReadSettingInternal] = bind(
	(key: keyof Settings) => getSetting$(key),
	// Default value factory - receives the key argument
	(_key: keyof Settings) => undefined as Settings[keyof Settings] | undefined,
);

const useReadSetting = <Key extends keyof Settings>(
	key: Key,
): Settings[Key] | undefined => {
	return useReadSettingInternal(key) as Settings[Key] | undefined;
};

export const useSetting = <Key extends keyof Settings, Value = Settings[Key]>(
	key: Key,
) => {
	const value = useReadSetting(key) as Value;

	const setValue = useCallback(
		(valueOrFunc: SetStateAction<Value>) => {
			if (typeof valueOrFunc === "function") {
				const update = valueOrFunc as (prev: Value) => Value;
				setSetting(key, update(value));
			} else {
				const newValue = valueOrFunc as Value;
				setSetting(key, newValue);
			}
		},
		[key, value],
	);

	return [value, setValue] as const;
};
