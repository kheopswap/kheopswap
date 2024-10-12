import { bind } from "@react-rxjs/core";
import { type SetStateAction, useCallback } from "react";

import { type Settings, getSetting$, setSetting } from "@kheopswap/settings";

const [useReadSetting] = bind(getSetting$);

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
