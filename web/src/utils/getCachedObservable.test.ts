import { Observable, of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedObservable$ } from "./getCachedObservable";

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

	it("keeps an entry nobody has subscribed to yet", () => {
		const create = vi.fn(() => new Observable<number>());
		const obs = getCachedObservable$("never-ns", "k", create);

		vi.advanceTimersByTime(500);
		expect(getCachedObservable$("never-ns", "k", create)).toBe(obs);
	});
});
