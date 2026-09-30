import { bind } from "@react-rxjs/core";
import type { Observable } from "rxjs";
import { safeParse, safeStringify } from "./serialization";

export const bindSerialized = <Args extends object, T>(
	getObservable: (args: Args) => Observable<T>,
	getDefaultValue: (args: Args) => T,
) => {
	const [useByKey] = bind(
		(key: string) => getObservable(safeParse<Args>(key)),
		(key: string) => getDefaultValue(safeParse<Args>(key)),
	);

	return (args: Args) => useByKey(safeStringify(args));
};
