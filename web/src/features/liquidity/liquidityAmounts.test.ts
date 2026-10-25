import { describe, expect, it } from "vitest";
import { getLiquidityToAdd, pairLiquidityAmount } from "./liquidityAmounts";

const decimals = [10, 6] as const;

describe("pairLiquidityAmount", () => {
	it("fills the other side at the pool ratio, to its full precision", () => {
		expect(
			pairLiquidityAmount({
				side: 0,
				text: "1",
				reserves: [3n * 10n ** 10n, 1_000_000n],
				decimals,
			}),
		).toEqual(["1", "0.333333"]);
	});

	it("clears both sides when one is emptied", () => {
		expect(
			pairLiquidityAmount({
				side: 1,
				text: "",
				reserves: [1n, 1n],
				decimals,
			}),
		).toEqual(["", ""]);
	});
});

describe("getLiquidityToAdd", () => {
	it("reads both amounts in plancks", () => {
		expect(getLiquidityToAdd(["1", "0.5"], decimals)).toEqual([
			10_000_000_000n,
			500_000n,
		]);
	});

	it("adds nothing while both amounts are empty", () => {
		expect(getLiquidityToAdd(["", ""], decimals)).toBeNull();
	});
});
