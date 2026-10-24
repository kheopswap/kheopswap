import { Observable, ReplaySubject, share } from "rxjs";

const CACHE = new Map<string, Observable<unknown>>();

const UNUSED_ENTRY_EVICTION_DELAY = 500;

export const getCachedObservable$ = <T>(
	namespace: string,
	key: string,
	create: () => Observable<T>,
): Observable<T> => {
	const cacheKey = `${namespace}::${key}`;

	const cached = CACHE.get(cacheKey);
	if (cached) return cached as Observable<T>;

	const evictWhenUnused$ = new Observable<void>((subscriber) => {
		const eviction = setTimeout(() => {
			if (CACHE.get(cacheKey) === entry) CACHE.delete(cacheKey);
			subscriber.next();
		}, UNUSED_ENTRY_EVICTION_DELAY);
		return () => clearTimeout(eviction);
	});

	const entry = create().pipe(
		share({
			connector: () => new ReplaySubject<T>(1),
			resetOnError: true,
			resetOnComplete: false,
			resetOnRefCountZero: () => evictWhenUnused$,
		}),
	);

	CACHE.set(cacheKey, entry);
	return entry;
};
