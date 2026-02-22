import { describe, expect, it } from "vitest";
import { isBigInt } from "./isBigInt";

describe("isBigInt", () => {
	it("returns true for bigint", () => {
		expect(isBigInt(0n)).toBe(true);
		expect(isBigInt(123n)).toBe(true);
		expect(isBigInt(-1n)).toBe(true);
	});

	it("returns false for number", () => {
		expect(isBigInt(0)).toBe(false);
		expect(isBigInt(123)).toBe(false);
	});

	it("returns false for string", () => {
		expect(isBigInt("123")).toBe(false);
	});

	it("returns false for null/undefined", () => {
		expect(isBigInt(null)).toBe(false);
		expect(isBigInt(undefined)).toBe(false);
	});
});
