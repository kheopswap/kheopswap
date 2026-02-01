import { describe, expect, it } from "vitest";
import { sortBigInt } from "./sortBigInt";

describe("sortBigInt", () => {
	describe("ascending order (default)", () => {
		it("should return positive when a > b", () => {
			expect(sortBigInt(10n, 5n)).toBe(1);
		});

		it("should return negative when a < b", () => {
			expect(sortBigInt(5n, 10n)).toBe(-1);
		});

		it("should return 0 when a === b", () => {
			expect(sortBigInt(5n, 5n)).toBe(0);
		});

		it("should sort array correctly", () => {
			const arr = [30n, 10n, 20n, 5n, 15n];
			arr.sort((a, b) => sortBigInt(a, b));
			expect(arr).toEqual([5n, 10n, 15n, 20n, 30n]);
		});
	});

	describe("descending order", () => {
		it("should return negative when a > b", () => {
			expect(sortBigInt(10n, 5n, true)).toBe(-1);
		});

		it("should return positive when a < b", () => {
			expect(sortBigInt(5n, 10n, true)).toBe(1);
		});

		it("should return 0 when a === b", () => {
			expect(sortBigInt(5n, 5n, true)).toBe(0);
		});

		it("should sort array correctly in descending order", () => {
			const arr = [30n, 10n, 20n, 5n, 15n];
			arr.sort((a, b) => sortBigInt(a, b, true));
			expect(arr).toEqual([30n, 20n, 15n, 10n, 5n]);
		});
	});

	describe("edge cases", () => {
		it("should handle zero", () => {
			expect(sortBigInt(0n, 5n)).toBe(-1);
			expect(sortBigInt(5n, 0n)).toBe(1);
			expect(sortBigInt(0n, 0n)).toBe(0);
		});

		it("should handle negative numbers", () => {
			expect(sortBigInt(-5n, -10n)).toBe(1);
			expect(sortBigInt(-10n, -5n)).toBe(-1);
		});

		it("should handle very large numbers", () => {
			const big1 = BigInt("999999999999999999999999999999");
			const big2 = BigInt("888888888888888888888888888888");
			expect(sortBigInt(big1, big2)).toBe(1);
		});
	});
});
