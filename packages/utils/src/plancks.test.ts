import { describe, expect, it } from "vitest";
import { plancksToTokens, tokensToPlancks } from "./plancks";

describe("plancks", () => {
	describe("tokensToPlancks", () => {
		it("converts whole numbers correctly", () => {
			expect(tokensToPlancks("1", 10)).toBe(10_000_000_000n);
			expect(tokensToPlancks("100", 10)).toBe(1_000_000_000_000n);
		});

		it("converts decimals correctly", () => {
			expect(tokensToPlancks("1.5", 10)).toBe(15_000_000_000n);
			expect(tokensToPlancks("0.1", 10)).toBe(1_000_000_000n);
			expect(tokensToPlancks("0.0001", 10)).toBe(1_000_000n);
		});

		it("handles zero", () => {
			expect(tokensToPlancks("0", 10)).toBe(0n);
			expect(tokensToPlancks(0, 10)).toBe(0n);
		});

		it("handles different decimal places", () => {
			// DOT has 10 decimals
			expect(tokensToPlancks("1", 10)).toBe(10_000_000_000n);
			// USDT typically has 6 decimals
			expect(tokensToPlancks("1", 6)).toBe(1_000_000n);
			// ETH has 18 decimals
			expect(tokensToPlancks("1", 18)).toBe(1_000_000_000_000_000_000n);
		});

		it("handles small amounts", () => {
			expect(tokensToPlancks("0.0000000001", 10)).toBe(1n);
		});

		it("accepts numbers", () => {
			expect(tokensToPlancks(1.5, 10)).toBe(15_000_000_000n);
		});
	});

	describe("plancksToTokens", () => {
		it("converts whole plancks correctly", () => {
			expect(plancksToTokens(10_000_000_000n, 10)).toBe("1");
			expect(plancksToTokens(1_000_000_000_000n, 10)).toBe("100");
		});

		it("converts fractional plancks correctly", () => {
			expect(plancksToTokens(15_000_000_000n, 10)).toBe("1.5");
			expect(plancksToTokens(1_000_000_000n, 10)).toBe("0.1");
		});

		it("handles zero", () => {
			expect(plancksToTokens(0n, 10)).toBe("0");
		});

		it("handles very small amounts", () => {
			expect(plancksToTokens(1n, 10)).toBe("0.0000000001");
		});

		it("accepts string plancks", () => {
			expect(plancksToTokens("10000000000", 10)).toBe("1");
		});

		it("is inverse of tokensToPlancks", () => {
			const original = "123.456789";
			const plancks = tokensToPlancks(original, 10);
			const result = plancksToTokens(plancks, 10);
			expect(result).toBe("123.456789");
		});
	});
});
