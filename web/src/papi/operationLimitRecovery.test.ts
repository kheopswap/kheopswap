import { createRequire } from "node:module";
import { Observable } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";

type WithRecovery = {
	getWithRecovery: () => {
		withRecoveryFn: <A extends unknown[], T>(
			fn: (...args: A) => Observable<T>,
		) => (...args: A) => Observable<T>;
	};
};

const require = createRequire(import.meta.url);
const observableClientDist = require
	.resolve("@polkadot-api/observable-client")
	.replace(/index\.js$/, "");
const { getWithRecovery } = (await import(
	`${observableClientDist}chainHead/enhancers/operationLimitRecovery.js`
)) as WithRecovery;

const operationLimitError = () =>
	Object.assign(new Error("ChainHead operations limit reached"), {
		name: "OperationLimitError",
	});

describe("observable-client operation limit queue", () => {
	afterEach(() => vi.useRealTimers());

	it("retries an operation the node refused for its limit even when nothing else is in flight", async () => {
		vi.useFakeTimers();
		const { withRecoveryFn } = getWithRecovery();
		const log: string[] = [];
		const results: string[] = [];

		const operation = (name: string, outcome: () => "ok" | "limit") =>
			withRecoveryFn(
				() =>
					new Observable<string>((observer) => {
						log.push(`${name} subscribed`);
						const timer = setTimeout(() => {
							if (outcome() === "limit") observer.error(operationLimitError());
							else {
								observer.next(name);
								observer.complete();
							}
						}, 10);
						return () => clearTimeout(timer);
					}),
			)();

		let refusals = 0;
		operation("A", () => "ok").subscribe((v) => results.push(v));
		operation("B", () => (++refusals <= 2 ? "limit" : "ok")).subscribe((v) =>
			results.push(v),
		);
		await vi.advanceTimersByTimeAsync(50);
		operation("C", () => "ok").subscribe((v) => results.push(v));
		await vi.advanceTimersByTimeAsync(10_000);

		expect(log).toEqual([
			"A subscribed",
			"B subscribed",
			"B subscribed",
			"B subscribed",
			"C subscribed",
		]);
		expect(results).toEqual(["A", "B", "C"]);
	});
});
