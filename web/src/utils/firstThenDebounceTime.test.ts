import { Subject } from "rxjs";
import { describe, expect, it } from "vitest";
import { firstThenDebounceTime } from "./firstThenDebounceTime";

describe("firstThenDebounceTime", () => {
	it("emits the first value immediately", () => {
		const subject = new Subject<number>();
		const values: number[] = [];

		const sub = subject.pipe(firstThenDebounceTime(100)).subscribe((v) => {
			values.push(v);
		});

		subject.next(1);
		expect(values).toEqual([1]);

		sub.unsubscribe();
	});

	it("passes through a single emission and completes", async () => {
		const subject = new Subject<number>();
		const values: number[] = [];
		let completed = false;

		const sub = subject.pipe(firstThenDebounceTime(10)).subscribe({
			next: (v) => values.push(v),
			complete: () => {
				completed = true;
			},
		});

		subject.next(42);
		subject.complete();

		await new Promise((r) => setTimeout(r, 50));
		expect(values).toEqual([42]);
		expect(completed).toBe(true);

		sub.unsubscribe();
	});

	it("debounces subsequent emissions with real subscriptions", async () => {
		const subject = new Subject<number>();
		const values: number[] = [];

		const sub = subject.pipe(firstThenDebounceTime(10)).subscribe((v) => {
			values.push(v);
		});

		subject.next(1); // passes immediately (take(1))
		expect(values).toEqual([1]);

		subject.next(2);
		subject.next(3);
		// 2 and 3 should be debounced
		expect(values).toEqual([1]);

		// Wait for debounce
		await new Promise((r) => setTimeout(r, 50));
		expect(values).toEqual([1, 3]);

		sub.unsubscribe();
	});
});
