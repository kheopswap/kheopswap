import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	retryOnceUnlessTimedOut,
	TimeoutError,
	withTimeout,
} from "./withTimeout";

const NEVER = new Promise<never>(() => {});

describe("withTimeout", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("passes through an answer that comes in time", async () => {
		const run = withTimeout(Promise.resolve("quote"), {
			ms: 1_000,
			signal: new AbortController().signal,
		});

		await expect(run).resolves.toBe("quote");
		expect(vi.getTimerCount()).toBe(0);
	});

	it("fails with a timeout when no answer comes in time", async () => {
		const run = withTimeout(NEVER, {
			ms: 1_000,
			signal: new AbortController().signal,
		});
		const outcome = expect(run).rejects.toBeInstanceOf(TimeoutError);

		await vi.advanceTimersByTimeAsync(999);
		expect(vi.getTimerCount()).toBe(1);
		await vi.advanceTimersByTimeAsync(1);
		await outcome;
	});

	it("stops waiting once the query is cancelled", async () => {
		const controller = new AbortController();
		const run = withTimeout(NEVER, { ms: 1_000, signal: controller.signal });

		controller.abort(new Error("cancelled"));

		await expect(run).rejects.toThrow("cancelled");
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("retryOnceUnlessTimedOut", () => {
	it.each([
		[0, new Error("rpc down"), true],
		[1, new Error("rpc down"), false],
		[0, new TimeoutError("no answer"), false],
	])(
		"after %s failures of %s, retries: %s",
		(failureCount, error, expected) => {
			expect(retryOnceUnlessTimedOut(failureCount, error)).toBe(expected);
		},
	);
});
