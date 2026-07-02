import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Token, TokenId } from "../../registry/tokens/types";
import {
	getAmmOutput,
	getMinAmountOut,
	getPriceImpact,
} from "../../utils/ammMath";
import { plancksToTokens } from "../../utils/plancks";
import { useSwapPricing } from "./useSwapPricing";

const USER_ADDRESS = "5UserAddress";
const DOT = "native::pah";
const USDC = "asset::pah::1337";

// mutable per-test fixture, referenced by the hoisted vi.mock factories
const fixture = vi.hoisted(() => ({
	reserves: undefined as [bigint, bigint] | null | undefined,
	isLoadingReserves: false,
	lpFee: 3000 as number | undefined,
	balances: {} as Record<string, bigint | undefined>,
	appFeeCanReceive: { canReceive: false } as {
		canReceive: boolean;
		reason?: string;
	},
	recipientCanReceive: { canReceive: true } as {
		canReceive: boolean;
		reason?: string;
	},
	rawPlancksOut: undefined as bigint | undefined,
	slippage: 0.01,
}));

const TOKENS: Record<string, { decimals: number; symbol: string }> = {
	[DOT]: { decimals: 10, symbol: "DOT" },
	[USDC]: { decimals: 6, symbol: "USDC" },
};

vi.mock("../../common/constants", async (importOriginal) => ({
	...(await importOriginal<object>()),
	APP_FEE_ADDRESS: "5AppFeeAddress",
	APP_FEE_PERCENT: 0.3,
}));

vi.mock("../../state/relay", () => ({
	useRelayChains: () => ({ assetHub: { id: "pah" } }),
}));

vi.mock("../../hooks/useTokensByChainId", () => ({
	useTokensByChainId: () => ({ data: {}, isLoading: false }),
}));

vi.mock("../../hooks/usePoolsByChainId", () => ({
	usePoolsByChainId: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../hooks/usePoolSupplies", () => ({
	usePoolSupplies: () => ({ data: [] }),
}));

vi.mock("../../hooks/useSetting", () => ({
	useSetting: () => [fixture.slippage, vi.fn()],
}));

vi.mock("../../hooks/usePoolReservesByTokenIds", () => ({
	usePoolReservesByTokenIds: () => ({
		data: fixture.reserves,
		isLoading: fixture.isLoadingReserves,
	}),
}));

vi.mock("./useAssetConvertionLPFee", () => ({
	useAssetConvertionLPFee: () => ({
		data: fixture.lpFee,
		isLoading: fixture.lpFee === undefined,
	}),
}));

vi.mock("../../hooks/useToken", () => ({
	useToken: ({ tokenId }: { tokenId: TokenId | null | undefined }) => ({
		data:
			tokenId && TOKENS[tokenId]
				? ({ id: tokenId, ...TOKENS[tokenId] } as unknown as Token)
				: null,
		isLoading: false,
	}),
}));

vi.mock("../../hooks/useBalance", () => ({
	useBalance: ({ tokenId }: { tokenId: TokenId | null | undefined }) => ({
		data: tokenId ? fixture.balances[tokenId] : undefined,
		isLoading: false,
	}),
}));

vi.mock("../../hooks/useExistentialDeposit", () => ({
	useExistentialDeposit: () => ({ data: 100n, isLoading: false }),
}));

vi.mock("../../hooks/useCanAccountReceive", () => ({
	useCanAccountReceive: ({ address }: { address: string | undefined }) => ({
		data:
			address === "5AppFeeAddress"
				? fixture.appFeeCanReceive
				: fixture.recipientCanReceive,
		isLoading: false,
	}),
}));

vi.mock("../../hooks/useAssetConvertPlancks", () => ({
	useAssetConvertPlancks: () => ({ plancksOut: fixture.rawPlancksOut }),
}));

// real pool numbers from the Permill LPFee bug report (#79)
const RESERVE_DOT = 7_842_000_000_000n; // 784.2 DOT (10 decimals)
const RESERVE_USDC = 663_200_000n; // 663.2 USDC (6 decimals)
const FOUR_DOT = 40_000_000_000n;

const renderPricing = (amountIn = "4") =>
	renderHook(() =>
		useSwapPricing({
			tokenIdIn: DOT,
			tokenIdOut: USDC,
			amountIn,
			accountAddress: USER_ADDRESS,
		}),
	).result.current;

beforeEach(() => {
	fixture.reserves = [RESERVE_DOT, RESERVE_USDC];
	fixture.isLoadingReserves = false;
	fixture.lpFee = 3000;
	fixture.balances = { [DOT]: 1_000_000_000_000n, [USDC]: 0n };
	fixture.appFeeCanReceive = { canReceive: false };
	fixture.recipientCanReceive = { canReceive: true };
	fixture.rawPlancksOut = undefined;
	fixture.slippage = 0.01;
});

describe("useSwapPricing", () => {
	it("computes the AMM output from reserves and a Permill LPFee", () => {
		const result = renderPricing();

		const expected = getAmmOutput(
			FOUR_DOT,
			RESERVE_DOT,
			RESERVE_USDC,
			3000,
		).amountOut;

		expect(result.totalIn).toBe(FOUR_DOT);
		expect(result.swapPlancksOut).toBe(expected);
		expect(result.swapPlancksOut).toBeGreaterThan(0n);
		expect(result.amountOut).toBe(plancksToTokens(expected, 6));
	});

	it("applies the slippage setting to compute minPlancksOut", () => {
		fixture.slippage = 0.005;
		const result = renderPricing();

		expect(result.minPlancksOut).toBe(
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			getMinAmountOut(result.swapPlancksOut!, 0.005),
		);
		// biome-ignore lint/style/noNonNullAssertion: asserted above
		expect(result.minPlancksOut!).toBeLessThan(result.swapPlancksOut!);
	});

	it("splits the app commission from the input when the fee account can receive it", () => {
		fixture.appFeeCanReceive = { canReceive: true };
		const result = renderPricing();

		const expectedFee = (FOUR_DOT * 3_000n) / 1_000_000n; // 0.3%
		expect(result.appCommission).toBe(expectedFee);
		expect(result.swapPlancksIn).toBe(FOUR_DOT - expectedFee);
		expect(result.swapPlancksOut).toBe(
			getAmmOutput(FOUR_DOT - expectedFee, RESERVE_DOT, RESERVE_USDC, 3000)
				.amountOut,
		);
	});

	it("swaps the full input without commission when the fee account cannot receive it", () => {
		fixture.appFeeCanReceive = { canReceive: false };
		const result = renderPricing();

		expect(result.appCommission).toBe(0n);
		expect(result.swapPlancksIn).toBe(FOUR_DOT);
	});

	it("derives the price impact from the spot conversion", () => {
		const spot = 3_400_000n;
		fixture.rawPlancksOut = spot;
		const result = renderPricing();

		expect(result.priceImpact).toBe(
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			getPriceImpact(spot, result.swapPlancksOut!),
		);
		// biome-ignore lint/style/noNonNullAssertion: asserted above
		expect(result.priceImpact!).toBeLessThan(0);
	});

	it("flags an insufficient balance", () => {
		fixture.balances = { [DOT]: 10n, [USDC]: 0n };
		const result = renderPricing();

		expect(result.hasInsufficientBalance).toBe(true);
	});

	it("reports insufficient liquidity for an empty pool", () => {
		fixture.reserves = [0n, 0n];
		const result = renderPricing();

		expect(result.hasInsufficientLiquidity).toBe(true);
		expect(result.outputErrorMessage).toBe("Insufficient liquidity");
	});

	it("reports a missing pool once reserves are done loading", () => {
		fixture.reserves = null;
		fixture.isLoadingReserves = false;
		const result = renderPricing();

		expect(result.isPoolNotFound).toBe(true);
		expect(result.outputErrorMessage).toBe("Liquidity pool not found");
	});

	it("gives the recipient error precedence over liquidity errors", () => {
		fixture.reserves = [0n, 0n];
		fixture.recipientCanReceive = {
			canReceive: false,
			reason: "Recipient cannot receive this token",
		};
		const result = renderPricing();

		expect(result.outputErrorMessage).toBe(
			"Recipient cannot receive this token",
		);
	});

	it("rejects an unparseable amount", () => {
		const result = renderPricing("not-a-number");

		expect(result.isValidAmountIn).toBe(false);
		expect(result.totalIn).toBeNull();
		expect(result.swapPlancksOut).toBeUndefined();
	});
});
