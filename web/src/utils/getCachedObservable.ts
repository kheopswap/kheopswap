import { Observable, ReplaySubject, type Subscription } from "rxjs";

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

	const source = create();
	let replay = new ReplaySubject<T>(1);
	let connection: Subscription | undefined;
	let subscribers = 0;
	let eviction: ReturnType<typeof setTimeout> | undefined;

	const evict = () => {
		if (CACHE.get(cacheKey) === entry) CACHE.delete(cacheKey);
	};

	const disconnect = () => {
		connection?.unsubscribe();
		connection = undefined;
		replay = new ReplaySubject<T>(1);
	};

	const connect = () => {
		const subject = replay;
		connection = source.subscribe({
			next: (value) => subject.next(value),
			complete: () => subject.complete(),
			error: (err) => {
				evict();
				disconnect();
				subject.error(err);
			},
		});
	};

	const entry = new Observable<T>((subscriber) => {
		subscribers++;
		clearTimeout(eviction);
		const subscription = replay.subscribe(subscriber);
		if (!connection) connect();

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

	CACHE.set(cacheKey, entry);
	return entry;
};
