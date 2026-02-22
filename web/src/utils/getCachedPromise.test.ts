import { describe, expect, it, vi } from "vitest";
import { getCachedPromise } from "./getCachedPromise";

describe("getCachedPromise", () => {
	it("returns the same promise for the same namespace+key", () => {
		const create = vi.fn(() => Promise.resolve(42));

		const p1 = getCachedPromise("prom-ns", "key1", create);
		const p2 = getCachedPromise("prom-ns", "key1", create);

		expect(p1).toBe(p2);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("returns different promises for different keys", () => {
		const p1 = getCachedPromise("prom-ns2", "a", () => Promise.resolve(1));
		const p2 = getCachedPromise("prom-ns2", "b", () => Promise.resolve(2));

		expect(p1).not.toBe(p2);
	});

	it("resolves to the created value", async () => {
		const p = getCachedPromise("prom-resolve", "k", () =>
			Promise.resolve("hello"),
		);
		await expect(p).resolves.toBe("hello");
	});

	it("caches even rejected promises", async () => {
		const err = new Error("fail");
		const create = vi.fn(() => Promise.reject(err));

		const p1 = getCachedPromise("prom-reject", "k", create);
		const p2 = getCachedPromise("prom-reject", "k", create);

		expect(p1).toBe(p2);
		expect(create).toHaveBeenCalledTimes(1);
		await expect(p1).rejects.toThrow("fail");
	});
});
