import type { Observable } from "rxjs";

const CACHE = new Map<string, Observable<unknown>>();

export const getCachedObservable$ = <T, Obs = Observable<T>>(
	namespace: string,
	key: string,
	create: () => Obs,
): Obs => {
	const cacheKey = `${namespace}::${key}`;

	if (!CACHE.has(cacheKey))
		CACHE.set(cacheKey, create() as Observable<unknown>);

	return CACHE.get(cacheKey) as Obs;
};
