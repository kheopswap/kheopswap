import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenId } from "../../registry/tokens/types";
import type { SwapRoute } from "./routes/swapRoute";
import { useSwapRisk } from "./useSwapRisk";

const USDC = "asset::pah::1337" as TokenId;
const PINK = "asset::pah::23" as TokenId;

const valuation = vi.hoisted(() => ({
	isLoading: false,
	stableValue: (_tokenId: string, plancks: bigint) =>
		plancks as bigint | undefined,
}));

vi.mock("../../hooks/useStablePrice", () => ({
	useStablePlancks: ({
		tokenId,
		plancks,
	}: {
		tokenId: string | undefined;
		plancks: bigint | null | undefined;
	}) => ({
		isLoading: !!tokenId && valuation.isLoading,
		stablePlancks:
			tokenId && typeof plancks === "bigint" && !valuation.isLoading
				? valuation.stableValue(tokenId, plancks)
				: undefined,
	}),
}));

const ROUTE = {
	kind: "amm-swap",
	chainId: "pah",
	tokenIdIn: USDC,
	tokenIdOut: PINK,
	path: [],
} as unknown as SwapRoute;

type Props = Parameters<typeof useSwapRisk>[0];

const severeSwap = (totalIn: bigint): Props => ({
	route: ROUTE,
	totalIn,
	plancksOut: totalIn / 2n,
	deliveryFee: undefined,
	priceImpact: -0.5,
});

describe("useSwapRisk", () => {
	beforeEach(() => {
		valuation.isLoading = false;
	});

	it("drops the acknowledgement once the amount changes, even if it changes back", () => {
		const { result, rerender } = renderHook(useSwapRisk, {
			initialProps: severeSwap(1_000_000n),
		});
		act(() => result.current.onAcknowledgeChange(true));
		expect(result.current.isAcknowledged).toBe(true);

		rerender(severeSwap(2_000_000n));
		expect(result.current.isAcknowledged).toBe(false);

		rerender(severeSwap(1_000_000n));
		expect(result.current.isAcknowledged).toBe(false);
	});

	it("drops the acknowledgement once the quote gets worse, even if it recovers", () => {
		const { result, rerender } = renderHook(useSwapRisk, {
			initialProps: severeSwap(1_000_000n),
		});
		act(() => result.current.onAcknowledgeChange(true));

		rerender({ ...severeSwap(1_000_000n), plancksOut: 400_000n });
		expect(result.current.isAcknowledged).toBe(false);

		rerender(severeSwap(1_000_000n));
		expect(result.current.isAcknowledged).toBe(false);
	});

	it("keeps the acknowledgement while the quote gets better", () => {
		const { result, rerender } = renderHook(useSwapRisk, {
			initialProps: severeSwap(1_000_000n),
		});
		act(() => result.current.onAcknowledgeChange(true));

		rerender({ ...severeSwap(1_000_000n), plancksOut: 600_000n });
		expect(result.current.isAcknowledged).toBe(true);
	});

	it("keeps the swap pending while the values it compares are loading", () => {
		valuation.isLoading = true;
		const { result } = renderHook(useSwapRisk, {
			initialProps: { ...severeSwap(1_000_000n), priceImpact: -0.149 },
		});
		expect(result.current.isAssessing).toBe(true);
	});

	it("does not wait for values when the route is a plain transfer", () => {
		valuation.isLoading = true;
		const { result } = renderHook(useSwapRisk, {
			initialProps: {
				...severeSwap(1_000_000n),
				route: { ...ROUTE, kind: "xcm-transfer" } as unknown as SwapRoute,
				priceImpact: undefined,
			},
		});
		expect(result.current.isAssessing).toBe(false);
	});
});
