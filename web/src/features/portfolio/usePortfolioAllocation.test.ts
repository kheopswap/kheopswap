import { describe, expect, it } from "vitest";
import type { BalanceWithStableSummary } from "../../types/balances";
import {
	type HoldingValuation,
	valuationOf,
} from "../../utils/getHoldingValuation";
import { countExcludedHoldings } from "./usePortfolioAllocation";

const holding = (
	tokenPlancks: bigint,
	valuation: HoldingValuation,
	isLoadingStablePlancks = false,
): BalanceWithStableSummary => ({
	tokenId: `asset::pah::${tokenPlancks}`,
	tokenPlancks,
	isLoadingTokenPlancks: false,
	isLoadingStablePlancks,
	isInitializing: false,
	...valuation,
});

const thin: HoldingValuation = { status: "thin-pool", stablePlancks: null };
const dwarfs: HoldingValuation = {
	status: "holding-dwarfs-pool",
	stablePlancks: null,
};
const unpriced: HoldingValuation = { status: "unpriced", stablePlancks: null };

describe("countExcludedHoldings", () => {
	it("counts thin and drained pools as low liquidity and poolless tokens as unpriced", () => {
		expect(
			countExcludedHoldings([
				holding(1n, valuationOf(10n)),
				holding(2n, thin),
				holding(3n, dwarfs),
				holding(4n, unpriced),
				holding(5n, unpriced),
			]),
		).toEqual({ lowLiquidityCount: 2, unpricedCount: 2 });
	});

	it("ignores tokens nobody holds and valuations still loading", () => {
		expect(
			countExcludedHoldings([
				holding(0n, thin),
				holding(0n, unpriced),
				holding(6n, unpriced, true),
			]),
		).toEqual({ lowLiquidityCount: 0, unpricedCount: 0 });
	});
});
