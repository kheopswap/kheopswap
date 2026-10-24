import { describe, expect, it } from "vitest";
import type { AccountBalanceWithStable } from "../types/balances";
import {
	type HoldingValuation,
	valuationOf,
} from "../utils/getHoldingValuation";
import {
	getBalancesByTokenSummary,
	valueHoldingsTogether,
} from "./useBalancesByTokenSummary";

const tokenId = "native::hydration";

type Overrides = Partial<
	Omit<AccountBalanceWithStable, keyof HoldingValuation>
>;

const balance = (
	overrides: Overrides,
	valuation: HoldingValuation = valuationOf(null),
): AccountBalanceWithStable => ({
	address: "5TestAddress",
	tokenId,
	tokenPlancks: 0n,
	isLoadingTokenPlancks: false,
	isLoadingStablePlancks: false,
	...overrides,
	...valuation,
});

const ethereumAccountBalance = balance({
	address: `0x${"ab".repeat(20)}`,
	tokenPlancks: null,
	isLoadingTokenPlancks: false,
});

describe("getBalancesByTokenSummary", () => {
	it("settles when an Ethereum account cannot hold the token", () => {
		const summary = getBalancesByTokenSummary([
			balance({ tokenPlancks: 0n }),
			ethereumAccountBalance,
		]);

		expect(summary[tokenId]).toMatchObject({
			tokenPlancks: 0n,
			isLoadingTokenPlancks: false,
			isInitializing: false,
		});
	});

	it("keeps initializing while a balance is still loading", () => {
		const summary = getBalancesByTokenSummary([
			balance({ tokenPlancks: 0n }),
			balance({
				address: "5Loading",
				tokenPlancks: null,
				isLoadingTokenPlancks: true,
			}),
		]);

		expect(summary[tokenId]?.isInitializing).toBe(true);
	});

	it("omits tokens that no account can hold", () => {
		expect(getBalancesByTokenSummary([ethereumAccountBalance])).toEqual({});
	});

	it("reports a holding without a pool as unpriced, distinct from low liquidity", () => {
		const summary = getBalancesByTokenSummary([
			balance(
				{ tokenPlancks: 100n },
				{ status: "unpriced", stablePlancks: null },
			),
		]);
		expect(summary[tokenId]).toMatchObject({
			status: "unpriced",
			stablePlancks: null,
		});
	});

	it("flags the whole token when one account's holding is flagged", () => {
		const summary = getBalancesByTokenSummary([
			balance({ tokenPlancks: 100n }, valuationOf(90n)),
			balance(
				{ address: "5Other", tokenPlancks: 10n ** 20n },
				{ status: "holding-dwarfs-pool", stablePlancks: null },
			),
		]);
		expect(summary[tokenId]).toMatchObject({
			status: "holding-dwarfs-pool",
			stablePlancks: null,
		});
	});
});

describe("valueHoldingsTogether", () => {
	const summary = getBalancesByTokenSummary([
		balance({ tokenPlancks: 100n }, valuationOf(90n)),
		balance({ address: "5Other", tokenPlancks: 100n }, valuationOf(90n)),
	]);

	it("replaces the sum of per-account quotes with the quote for the whole holding", () => {
		const valued = valueHoldingsTogether(summary, {
			[tokenId]: { ...valuationOf(150n), isLoadingStablePlancks: false },
		});
		expect(valued[tokenId]).toMatchObject({
			tokenPlancks: 200n,
			stablePlancks: 150n,
		});
	});

	it("flags the whole holding when its pool is too thin", () => {
		const valued = valueHoldingsTogether(summary, {
			[tokenId]: {
				status: "thin-pool",
				stablePlancks: null,
				isLoadingStablePlancks: false,
			},
		});
		expect(valued[tokenId]).toMatchObject({
			stablePlancks: null,
			status: "thin-pool",
		});
	});

	it("shows the per-account sum as still loading until the whole holding is valued", () => {
		expect(valueHoldingsTogether(summary, {})[tokenId]).toMatchObject({
			stablePlancks: 180n,
			isLoadingStablePlancks: true,
		});
	});
});
