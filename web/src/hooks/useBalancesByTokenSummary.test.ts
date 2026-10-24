import { describe, expect, it } from "vitest";
import type { TokenValuation } from "../state/prices";
import type { AccountBalanceWithStable } from "../types/balances";
import { getAmmOutput } from "../utils/ammMath";
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
	const tokenValuation: TokenValuation = {
		tokenId,
		nativeTokenId: "native::pah",
		stableTokenId: "native::pah",
		lowLiquidityFloorStablePlancks: 0n,
		reservesNativeToToken: [1_000_000n, 1_000_000n],
		reservesNativeToStable: null,
		lpFee: 0,
		isLoading: false,
	};

	it("values the whole holding through the pool instead of summing per-account quotes", () => {
		const valued = valueHoldingsTogether(summary, {
			[tokenId]: tokenValuation,
		});
		expect(valued[tokenId]).toMatchObject({
			tokenPlancks: 200n,
			status: "priced",
			stablePlancks: getAmmOutput(200n, 1_000_000n, 1_000_000n, 0).amountOut,
			isLoadingStablePlancks: false,
		});
	});

	it("flags the whole holding when its pool is too thin", () => {
		const valued = valueHoldingsTogether(summary, {
			[tokenId]: {
				...tokenValuation,
				lowLiquidityFloorStablePlancks: 10n ** 9n,
			},
		});
		expect(valued[tokenId]).toMatchObject({
			stablePlancks: null,
			status: "thin-pool",
		});
	});

	it("revalues a changed balance from the same token valuation", () => {
		const grown = getBalancesByTokenSummary([
			balance({ tokenPlancks: 10n ** 9n }, valuationOf(90n)),
		]);
		const valued = valueHoldingsTogether(grown, { [tokenId]: tokenValuation });
		expect(valued[tokenId]).toMatchObject({ status: "holding-dwarfs-pool" });
	});

	it("shows the per-account sum as still loading until the whole holding is valued", () => {
		expect(valueHoldingsTogether(summary, {})[tokenId]).toMatchObject({
			stablePlancks: 180n,
			isLoadingStablePlancks: true,
		});
	});
});
