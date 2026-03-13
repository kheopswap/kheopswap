import { describe, expect, it } from "vitest";
import { isNumber } from "./isNumber";

describe("isNumber", () => {
	it("returns true for numbers", () => {
		expect(isNumber(0)).toBe(true);
		expect(isNumber(42)).toBe(true);
		expect(isNumber(-1)).toBe(true);
		expect(isNumber(3.14)).toBe(true);
	});

	it("returns true for special number values", () => {
		expect(isNumber(Number.NaN)).toBe(true);
		expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true);
		expect(isNumber(Number.NEGATIVE_INFINITY)).toBe(true);
	});

	it("returns false for non-numbers", () => {
		expect(isNumber("42")).toBe(false);
		expect(isNumber(null)).toBe(false);
		expect(isNumber(undefined)).toBe(false);
		expect(isNumber(true)).toBe(false);
		expect(isNumber(123n)).toBe(false);
		expect(isNumber({})).toBe(false);
	});
});
