import { describe, expect, it } from "vitest";
import { sortBigInt } from "./sortBigInt";

describe("sortBigInt", () => {
	it("sorts ascending by default", () => {
		expect(sortBigInt(1n, 2n)).toBe(-1);
		expect(sortBigInt(2n, 1n)).toBe(1);
		expect(sortBigInt(1n, 1n)).toBe(0);
	});

	it("sorts descending when desc=true", () => {
		expect(sortBigInt(1n, 2n, true)).toBe(1);
		expect(sortBigInt(2n, 1n, true)).toBe(-1);
		expect(sortBigInt(1n, 1n, true)).toBe(0);
	});

	it("works with Array.sort", () => {
		const arr = [30n, 10n, 20n];
		expect([...arr].sort(sortBigInt)).toEqual([10n, 20n, 30n]);
		expect([...arr].sort((a, b) => sortBigInt(a, b, true))).toEqual([
			30n,
			20n,
			10n,
		]);
	});
});
