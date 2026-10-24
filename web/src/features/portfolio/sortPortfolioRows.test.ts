import { describe, expect, it } from "vitest";
import type { Token } from "../../registry/tokens/types";
import { sortByColumn } from "./sortPortfolioRows";
import type { PortfolioRowData } from "./types";

const unvaluedRow = (
	symbol: string,
	decimals: number,
	tokenPlancks: bigint,
): PortfolioRowData => {
	const token = { id: `asset::pah::${symbol}`, symbol, decimals } as Token;
	return {
		token,
		balance: {
			tokenId: token.id,
			tokenPlancks,
			isLoadingTokenPlancks: false,
			isLoadingStablePlancks: false,
			isInitializing: false,
			status: "unpriced",
			stablePlancks: null,
		},
		tvl: null,
		price: null,
	};
};

describe("sortByColumn", () => {
	it("sorts unvalued balances by token amount across decimals", () => {
		const oneCfg = unvaluedRow("CFG", 18, 10n ** 18n);
		const thousandUsd = unvaluedRow("USD", 6, 1_000n * 10n ** 6n);
		const halfDot = unvaluedRow("DOT", 10, 5n * 10n ** 9n);

		const sorted = [oneCfg, halfDot, thousandUsd].sort(sortByColumn("balance"));

		expect(sorted.map((row) => row.token.symbol)).toEqual([
			"USD",
			"CFG",
			"DOT",
		]);
	});
});
