import { describe, expect, it } from "vitest";
import { getSwapRate } from "./getSwapRate";

const usdc = (plancks: bigint) => ({ plancks, decimals: 6 });
const dot = (plancks: bigint) => ({ plancks, decimals: 10 });

describe("getSwapRate", () => {
	it("gives how much of the received token one sent token buys", () => {
		expect(getSwapRate(usdc(2_000_000n), usdc(1_686_200n))).toBe(0.8431);
	});

	it("accounts for each token's decimals", () => {
		expect(getSwapRate(dot(10_000_000_000n), usdc(4_200_000n))).toBe(4.2);
		expect(getSwapRate(usdc(4_200_000n), dot(10_000_000_000n))).toBeCloseTo(
			0.238095,
		);
	});
});
