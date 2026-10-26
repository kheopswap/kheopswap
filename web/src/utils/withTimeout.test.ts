import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CHAIN_QUERY_TIMEOUT_MS,
	retryOnceUnlessTimedOut,
	TimeoutError,
	withChainTimeout,
	withTimeout,
} from "./withTimeout";

const connection = vi.hoisted(() => ({ delayMs: 0 }));

vi.mock("../papi/getApi", () => ({
	getApi: () =>
		new Promise((resolve) => setTimeout(resolve, connection.delayMs)),
}));

const NEVER = new Promise<never>(() => {});

const resolveAfter = <T>(ms: number, value: T) =>
	new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

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

	it("fails at once when the query was cancelled before it started", async () => {
		const controller = new AbortController();
		controller.abort(new Error("cancelled"));

		const run = withTimeout(NEVER, { ms: 1_000, signal: controller.signal });

		await expect(run).rejects.toThrow("cancelled");
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("withChainTimeout", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		connection.delayMs = 0;
	});

	it("leaves the time spent connecting to the chain out of the deadline", async () => {
		connection.delayMs = CHAIN_QUERY_TIMEOUT_MS;
		const signal = new AbortController().signal;

		const run = withChainTimeout(
			"pah",
			() => resolveAfter(1_000, "quote"),
			signal,
		);
		const outcome = expect(run).resolves.toBe("quote");

		await vi.advanceTimersByTimeAsync(CHAIN_QUERY_TIMEOUT_MS + 1_000);
		await outcome;
	});

	it("still times out a query that hangs once connected", async () => {
		const signal = new AbortController().signal;

		const run = withChainTimeout("pah", () => NEVER, signal);
		const outcome = expect(run).rejects.toBeInstanceOf(TimeoutError);

		await vi.advanceTimersByTimeAsync(CHAIN_QUERY_TIMEOUT_MS);
		await outcome;
	});

	it("aborts the query once it timed out", async () => {
		const querySignals: AbortSignal[] = [];

		const run = withChainTimeout(
			"pah",
			(signal) => {
				querySignals.push(signal);
				return NEVER;
			},
			new AbortController().signal,
		);
		const outcome = expect(run).rejects.toBeInstanceOf(TimeoutError);

		await vi.advanceTimersByTimeAsync(CHAIN_QUERY_TIMEOUT_MS);
		await outcome;
		expect(querySignals.map(({ aborted }) => aborted)).toEqual([true]);
	});

	it("does not start the query when it was cancelled while connecting", async () => {
		connection.delayMs = 5_000;
		const controller = new AbortController();
		const query = vi.fn(() => resolveAfter(1_000, "quote"));

		const run = withChainTimeout("pah", query, controller.signal);
		const outcome = expect(run).rejects.toThrow("cancelled");
		controller.abort(new Error("cancelled"));

		await vi.advanceTimersByTimeAsync(5_000);
		await outcome;
		expect(query).not.toHaveBeenCalled();
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
