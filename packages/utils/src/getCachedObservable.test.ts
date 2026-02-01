import { of, Subject } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedObservable$ } from "./getCachedObservable";

describe("getCachedObservable$", () => {
	beforeEach(() => {
		// Clear the cache by using a unique namespace for each test
		vi.useFakeTimers();
	});

	it("returns the same observable for the same key", () => {
		const namespace = `test-${Date.now()}-same`;
		let createCount = 0;

		const create = () => {
			createCount++;
			return of("value");
		};

		const obs1 = getCachedObservable$(namespace, "key1", create);
		const obs2 = getCachedObservable$(namespace, "key1", create);

		expect(obs1).toBe(obs2);
		expect(createCount).toBe(1);
	});

	it("returns different observables for different keys", () => {
		const namespace = `test-${Date.now()}-diff`;
		let createCount = 0;

		const create = () => {
			createCount++;
			return of(`value-${createCount}`);
		};

		const obs1 = getCachedObservable$(namespace, "key1", create);
		const obs2 = getCachedObservable$(namespace, "key2", create);

		expect(obs1).not.toBe(obs2);
		expect(createCount).toBe(2);
	});

	it("returns different observables for different namespaces", () => {
		const base = Date.now();
		let createCount = 0;

		const create = () => {
			createCount++;
			return of(`value-${createCount}`);
		};

		const obs1 = getCachedObservable$(`namespace-${base}-1`, "key", create);
		const obs2 = getCachedObservable$(`namespace-${base}-2`, "key", create);

		expect(obs1).not.toBe(obs2);
		expect(createCount).toBe(2);
	});

	it("maintains cache across multiple calls", async () => {
		const namespace = `test-${Date.now()}-maintain`;
		const subject = new Subject<number>();
		let createCount = 0;

		const create = () => {
			createCount++;
			return subject.asObservable();
		};

		const obs1 = getCachedObservable$(namespace, "key", create);
		const obs2 = getCachedObservable$(namespace, "key", create);
		const obs3 = getCachedObservable$(namespace, "key", create);

		expect(createCount).toBe(1);

		// All should receive the same values
		const values1: number[] = [];
		const values2: number[] = [];
		const values3: number[] = [];

		obs1.subscribe((v) => values1.push(v));
		obs2.subscribe((v) => values2.push(v));
		obs3.subscribe((v) => values3.push(v));

		subject.next(42);

		expect(values1).toEqual([42]);
		expect(values2).toEqual([42]);
		expect(values3).toEqual([42]);
	});
});
