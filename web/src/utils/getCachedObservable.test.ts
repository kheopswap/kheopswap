import { Observable } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { getCachedObservable$ } from "./getCachedObservable";

describe("getCachedObservable$", () => {
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

	it("invokes the factory only once per unique cache key", () => {
		const factory = vi.fn(() => new Observable<string>());

		getCachedObservable$("once-ns", "once-key", factory);
		getCachedObservable$("once-ns", "once-key", factory);
		getCachedObservable$("once-ns", "once-key", factory);

		expect(factory).toHaveBeenCalledTimes(1);
	});
});
