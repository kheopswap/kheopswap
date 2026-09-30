import {
	type DefaultedStateObservable,
	state,
	useStateObservable,
} from "@react-rxjs/core";
import { useEffect } from "react";
import { defer, type Observable } from "rxjs";
import { safeParse, safeStringify } from "./serialization";

const UNUSED_ENTRY_EVICTION_DELAY = 500;

export const bindSerialized = <Args extends unknown[], T>(
	getObservable: (...args: Args) => Observable<T>,
	getDefaultValue: (...args: Args) => T,
) => {
	const cache = new Map<string, DefaultedStateObservable<T>>();

	const scheduleEviction = (
		key: string,
		entry: DefaultedStateObservable<T>,
	) => {
		setTimeout(() => {
			if (cache.get(key) === entry && !entry.getRefCount()) cache.delete(key);
		}, UNUSED_ENTRY_EVICTION_DELAY);
	};

	const getEntry = (key: string) => {
		const cached = cache.get(key);
		if (cached) return cached;

		const args = safeParse<Args>(key);
		const entry = state(
			defer(() => getObservable(...args)),
			getDefaultValue(...args),
		);
		cache.set(key, entry);
		scheduleEviction(key, entry);
		return entry;
	};

	return (...args: Args): T => {
		const key = safeStringify(args);
		const entry = getEntry(key);

		useEffect(() => () => scheduleEviction(key, entry), [key, entry]);

		return useStateObservable(entry) as T;
	};
};
