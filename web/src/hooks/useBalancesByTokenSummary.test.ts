import { describe, expect, it } from "vitest";
import type { AccountBalanceWithStable } from "../types/balances";
import {
	getBalancesByTokenSummary,
	valueHoldingsTogether,
} from "./useBalancesByTokenSummary";

const tokenId = "native::hydration";

const balance = (
	overrides: Partial<AccountBalanceWithStable>,
): AccountBalanceWithStable => ({
	address: "5TestAddress",
	tokenId,
	tokenPlancks: 0n,
	isLoadingTokenPlancks: false,
	stablePlancks: null,
	isLoadingStablePlancks: false,
	isLowLiquidity: false,
	...overrides,
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
});

describe("valueHoldingsTogether", () => {
	const summary = getBalancesByTokenSummary([
		balance({ tokenPlancks: 100n, stablePlancks: 90n }),
		balance({ address: "5Other", tokenPlancks: 100n, stablePlancks: 90n }),
	]);

	it("replaces the sum of per-account quotes with the quote for the whole holding", () => {
		const valued = valueHoldingsTogether(summary, {
			[tokenId]: {
				stablePlancks: 150n,
				isLoadingStablePlancks: false,
				isLowLiquidity: false,
			},
		});
		expect(valued[tokenId]).toMatchObject({
			tokenPlancks: 200n,
			stablePlancks: 150n,
		});
	});

	it("flags the whole holding when its pool is too thin", () => {
		const valued = valueHoldingsTogether(summary, {
			[tokenId]: {
				stablePlancks: null,
				isLoadingStablePlancks: false,
				isLowLiquidity: true,
			},
		});
		expect(valued[tokenId]).toMatchObject({
			stablePlancks: null,
			isLowLiquidity: true,
		});
	});

	it("shows the per-account sum as still loading until the whole holding is valued", () => {
		expect(valueHoldingsTogether(summary, {})[tokenId]).toMatchObject({
			stablePlancks: 180n,
			isLoadingStablePlancks: true,
		});
	});
});
