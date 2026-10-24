import { Observable, ReplaySubject, type Subscription } from "rxjs";

type CacheEntry = { observable: Observable<unknown>; disconnect: () => void };

const CACHE = new Map<string, CacheEntry>();

const UNUSED_ENTRY_EVICTION_DELAY = 500;

export const clearCachedObservables = () => {
	for (const { disconnect } of CACHE.values()) disconnect();
	CACHE.clear();
};

export const getCachedObservable$ = <T>(
	namespace: string,
	key: string,
	create: () => Observable<T>,
): Observable<T> => {
	const cacheKey = `${namespace}::${key}`;

	const cached = CACHE.get(cacheKey);
	if (cached) return cached.observable as Observable<T>;

	const source = create();
	let replay = new ReplaySubject<T>(1);
	let connection: Subscription | undefined;
	let connecting = false;
	let subscribers = 0;
	let eviction: ReturnType<typeof setTimeout> | undefined;

	const evict = () => {
		if (CACHE.get(cacheKey)?.observable === entry) CACHE.delete(cacheKey);
	};

	const disconnect = () => {
		clearTimeout(eviction);
		connection?.unsubscribe();
		connection = undefined;
		replay = new ReplaySubject<T>(1);
	};

	const connect = () => {
		const subject = replay;
		let failed = false;
		connecting = true;
		const subscription = source.subscribe({
			next: (value) => subject.next(value),
			complete: () => subject.complete(),
			error: (err) => {
				failed = true;
				evict();
				disconnect();
				subject.error(err);
			},
		});
		connecting = false;
		if (!failed) connection = subscription;
	};

	const entry = new Observable<T>((subscriber) => {
		subscribers++;
		clearTimeout(eviction);
		const subscription = replay.subscribe(subscriber);
		if (!connection && !connecting) connect();

		return () => {
			subscription.unsubscribe();
			subscribers--;
			if (subscribers) return;
			eviction = setTimeout(() => {
				evict();
				disconnect();
			}, UNUSED_ENTRY_EVICTION_DELAY);
		};
	});

	CACHE.set(cacheKey, { observable: entry, disconnect });
	return entry;
};
