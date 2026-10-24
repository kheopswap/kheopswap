import { Observable, of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearCachedObservables,
	getCachedObservable$,
} from "./getCachedObservable";

describe("getCachedObservable$", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("returns the same observable for the same namespace+key", () => {
		const create = vi.fn(() => new Observable<number>());

		const obs1 = getCachedObservable$("test-ns", "key1", create);
		const obs2 = getCachedObservable$("test-ns", "key1", create);

		expect(obs1).toBe(obs2);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("returns different observables for different keys", () => {
		const obs1 = getCachedObservable$(
			"test-ns2",
			"a",
			() => new Observable<number>(),
		);
		const obs2 = getCachedObservable$(
			"test-ns2",
			"b",
			() => new Observable<number>(),
		);

		expect(obs1).not.toBe(obs2);
	});

	it("returns different observables for different namespaces", () => {
		const obs1 = getCachedObservable$(
			"ns-x",
			"same-key",
			() => new Observable<number>(),
		);
		const obs2 = getCachedObservable$(
			"ns-y",
			"same-key",
			() => new Observable<number>(),
		);

		expect(obs1).not.toBe(obs2);
	});

	it("subscribes the underlying source and forwards its values", () => {
		const values: number[] = [];
		getCachedObservable$("forward-ns", "k", () => of(1, 2)).subscribe((v) =>
			values.push(v),
		);
		expect(values).toEqual([1, 2]);
	});

	it("keeps the entry while a subscriber is attached", () => {
		const create = vi.fn(() => new Observable<number>());
		const obs = getCachedObservable$("keep-ns", "k", create);
		const subscription = obs.subscribe();

		vi.advanceTimersByTime(10_000);
		expect(getCachedObservable$("keep-ns", "k", create)).toBe(obs);
		expect(create).toHaveBeenCalledTimes(1);

		subscription.unsubscribe();
	});

	it("evicts an entry left without subscribers and recreates it on the next call", () => {
		const create = vi.fn(() => new Observable<number>());
		const obs = getCachedObservable$("evict-ns", "k", create);
		obs.subscribe().unsubscribe();

		vi.advanceTimersByTime(499);
		expect(getCachedObservable$("evict-ns", "k", create)).toBe(obs);

		vi.advanceTimersByTime(1);
		expect(getCachedObservable$("evict-ns", "k", create)).not.toBe(obs);
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("cancels a pending eviction when a subscriber comes back", () => {
		const create = vi.fn(() => new Observable<number>());
		const obs = getCachedObservable$("resub-ns", "k", create);
		obs.subscribe().unsubscribe();

		vi.advanceTimersByTime(400);
		const subscription = obs.subscribe();
		vi.advanceTimersByTime(10_000);

		expect(getCachedObservable$("resub-ns", "k", create)).toBe(obs);
		subscription.unsubscribe();
	});

	it("keeps the upstream connected through the eviction delay", () => {
		let connections = 0;
		const obs = getCachedObservable$(
			"upstream-ns",
			"k",
			() =>
				new Observable<number>((subscriber) => {
					connections++;
					subscriber.next(connections);
				}),
		);
		const values: number[] = [];

		obs.subscribe((v) => values.push(v)).unsubscribe();
		vi.advanceTimersByTime(400);
		const subscription = obs.subscribe((v) => values.push(v));

		expect(connections).toBe(1);
		expect(values).toEqual([1, 1]);
		subscription.unsubscribe();
	});

	it("disconnects the upstream once the entry is evicted", () => {
		let connections = 0;
		const obs = getCachedObservable$(
			"disconnect-ns",
			"k",
			() =>
				new Observable<number>(() => {
					connections++;
				}),
		);

		obs.subscribe().unsubscribe();
		vi.advanceTimersByTime(500);
		obs.subscribe().unsubscribe();

		expect(connections).toBe(2);
	});

	it("evicts a completed entry once nobody uses it", () => {
		const create = vi.fn(() => of(1));
		const obs = getCachedObservable$("complete-ns", "k", create);
		obs.subscribe().unsubscribe();

		vi.advanceTimersByTime(500);

		expect(getCachedObservable$("complete-ns", "k", create)).not.toBe(obs);
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("replays a completed source within the delay without re-running it", () => {
		const create = vi.fn(() => of(42));
		const obs = getCachedObservable$("replay-ns", "k", create);
		const values: number[] = [];

		obs.subscribe((v) => values.push(v));
		vi.advanceTimersByTime(400);
		obs.subscribe((v) => values.push(v));

		expect(values).toEqual([42, 42]);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("re-runs a source that errored on the next subscription", () => {
		let attempts = 0;
		const obs = getCachedObservable$(
			"error-ns",
			"k",
			() =>
				new Observable<number>((subscriber) => {
					attempts++;
					if (attempts === 1) subscriber.error(new Error("rpc down"));
					else subscriber.next(attempts);
				}),
		);
		const errors: unknown[] = [];
		const values: number[] = [];

		obs.subscribe({ error: (err) => errors.push(err) });
		getCachedObservable$("error-ns", "k", () => of(-1)).subscribe((v) =>
			values.push(v),
		);

		expect(errors).toHaveLength(1);
		expect(values).toEqual([-1]);
	});

	it("reconnects a source that errored synchronously when the same entry is retried", () => {
		let attempts = 0;
		const obs = getCachedObservable$(
			"sync-error-ns",
			"k",
			() =>
				new Observable<number>((subscriber) => {
					attempts++;
					if (attempts === 1) subscriber.error(new Error("transient"));
					else subscriber.next(attempts);
				}),
		);
		const values: number[] = [];

		obs.subscribe({ error: () => {} });
		obs.subscribe((v) => values.push(v));

		expect(values).toEqual([2]);
	});

	it("drops every entry and its upstream when cleared", () => {
		let connections = 0;
		const create = () =>
			new Observable<number>(() => {
				connections++;
			});
		const obs = getCachedObservable$("clear-ns", "k", create);
		const subscription = obs.subscribe();

		clearCachedObservables();
		subscription.unsubscribe();
		getCachedObservable$("clear-ns", "k", create).subscribe().unsubscribe();

		expect(getCachedObservable$("clear-ns", "k", create)).not.toBe(obs);
		expect(connections).toBe(2);
	});

	it("connects the source once when an emission re-subscribes the same entry", () => {
		let connections = 0;
		const obs = getCachedObservable$(
			"reentrant-ns",
			"k",
			() =>
				new Observable<number>((subscriber) => {
					connections++;
					subscriber.next(1);
					return () => {
						connections--;
					};
				}),
		);
		const values: number[] = [];

		const outer = obs.subscribe((v) => {
			values.push(v);
			if (values.length === 1)
				obs.subscribe((inner) => values.push(inner * 10)).unsubscribe();
		});
		expect(connections).toBe(1);
		expect(values).toEqual([1, 10]);

		outer.unsubscribe();
		vi.advanceTimersByTime(500);
		expect(connections).toBe(0);
	});

	it("keeps an entry nobody has subscribed to yet", () => {
		const create = vi.fn(() => new Observable<number>());
		const obs = getCachedObservable$("never-ns", "k", create);

		vi.advanceTimersByTime(500);
		expect(getCachedObservable$("never-ns", "k", create)).toBe(obs);
	});
});
