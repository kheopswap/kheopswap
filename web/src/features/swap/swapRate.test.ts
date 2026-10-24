import { describe, expect, it } from "vitest";
import { getSwapRate } from "./swapRate";

const usdc = (plancks: bigint) => ({ plancks, decimals: 6 });
const dot = (plancks: bigint) => ({ plancks, decimals: 10 });

describe("getSwapRate", () => {
	it("gives how much of the output one input token buys", () => {
		expect(getSwapRate(usdc(2_000_000n), usdc(1_686_200n))).toBe("0.8431");
	});

	it("accounts for each token's decimals", () => {
		expect(getSwapRate(dot(10_000_000_000n), usdc(4_200_000n))).toBe("4.2");
		expect(getSwapRate(usdc(4_200_000n), dot(10_000_000_000n))).toBe(
			"0.238095238095238095",
		);
	});

	it.each([
		[usdc(0n), usdc(1n)],
		[usdc(1n), usdc(0n)],
	])("has no rate without both amounts", (amountIn, amountOut) => {
		expect(getSwapRate(amountIn, amountOut)).toBeUndefined();
	});
});
