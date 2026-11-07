import { describe, expect, it } from "vitest";
import type { AccountBalanceWithStable } from "../types/balances";
import { getBalancesByTokenSummary } from "./useBalancesByTokenSummary";

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
