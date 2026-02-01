import { describe, expect, it } from "vitest";
import { isBigInt } from "./isBigInt";

describe("isBigInt", () => {
	it("should return true for bigint values", () => {
		expect(isBigInt(0n)).toBe(true);
		expect(isBigInt(123n)).toBe(true);
		expect(isBigInt(-456n)).toBe(true);
		expect(isBigInt(BigInt(999))).toBe(true);
		expect(isBigInt(BigInt("12345678901234567890"))).toBe(true);
	});

	it("should return false for numbers", () => {
		expect(isBigInt(0)).toBe(false);
		expect(isBigInt(123)).toBe(false);
		expect(isBigInt(-456)).toBe(false);
		expect(isBigInt(3.14)).toBe(false);
		expect(isBigInt(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isBigInt(Number.NaN)).toBe(false);
	});

	it("should return false for other types", () => {
		expect(isBigInt(null)).toBe(false);
		expect(isBigInt(undefined)).toBe(false);
		expect(isBigInt("123")).toBe(false);
		expect(isBigInt("123n")).toBe(false);
		expect(isBigInt(true)).toBe(false);
		expect(isBigInt({})).toBe(false);
		expect(isBigInt([])).toBe(false);
	});
});
