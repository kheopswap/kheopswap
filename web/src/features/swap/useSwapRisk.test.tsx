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

const priceAsIs = (_tokenId: string, plancks: bigint) =>
	plancks as bigint | undefined;

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

vi.mock("../../hooks/useStablePlancksMulti", () => ({
	useStablePlancksMulti: ({
		inputs,
	}: {
		inputs: { tokenId: string; plancks: bigint | undefined }[];
	}) =>
		inputs.length
			? {
					isLoading: valuation.isLoading,
					data: inputs.map(({ tokenId, plancks }) => ({
						stablePlancks:
							valuation.isLoading || plancks === undefined
								? null
								: (valuation.stableValue(tokenId, plancks) ?? null),
						isLoadingStablePlancks: valuation.isLoading,
					})),
				}
			: { isLoading: true, data: [] },
}));

const ROUTE = {
	kind: "amm-swap",
	chainId: "pah",
	tokenIdIn: USDC,
	tokenIdOut: PINK,
	path: [],
} as unknown as SwapRoute;

type Props = Parameters<typeof useSwapRisk>[0];

const severeSwap = (totalIn: bigint, signer = "account-1"): Props => ({
	signer,
	route: ROUTE,
	tokenIn: { id: USDC, decimals: 6 },
	tokenOut: { id: PINK, decimals: 10 },
	totalIn,
	plancksOut: totalIn / 2n,
	deliveryFee: undefined,
	destinationFee: undefined,
	priceImpact: -0.5,
});

describe("useSwapRisk", () => {
	beforeEach(() => {
		valuation.isLoading = false;
		valuation.stableValue = priceAsIs;
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

	it("drops the acknowledgement once the amount is cleared", () => {
		const { result, rerender } = renderHook(useSwapRisk, {
			initialProps: severeSwap(1_000_000n),
		});
		act(() => result.current.onAcknowledgeChange(true));

		rerender({
			...severeSwap(1_000_000n),
			totalIn: null,
			plancksOut: undefined,
			priceImpact: undefined,
		});
		rerender(severeSwap(1_000_000n));
		expect(result.current.isAcknowledged).toBe(false);
	});

	it("drops the acknowledgement once the account changes, even if it changes back", () => {
		const { result, rerender } = renderHook(useSwapRisk, {
			initialProps: severeSwap(1_000_000n, "account-1"),
		});
		act(() => result.current.onAcknowledgeChange(true));

		rerender(severeSwap(1_000_000n, "account-2"));
		expect(result.current.isAcknowledged).toBe(false);

		rerender(severeSwap(1_000_000n, "account-1"));
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

	it("does not hold a swap that has no transfer fees to value", () => {
		const { result } = renderHook(useSwapRisk, {
			initialProps: {
				...severeSwap(1_000_000n),
				priceImpact: -0.01,
				plancksOut: 1_000_000n,
			},
		});
		expect(result.current.isAssessing).toBe(false);
		expect(result.current.transferFees).toBeUndefined();
	});

	it("keeps the swap pending while the values it compares are loading", () => {
		valuation.isLoading = true;
		const { result } = renderHook(useSwapRisk, {
			initialProps: { ...severeSwap(1_000_000n), priceImpact: -0.149 },
		});
		expect(result.current.isAssessing).toBe(true);
	});

	describe("on a plain cross-chain transfer", () => {
		const DOT = "native::pah" as TokenId;
		const HYDRATION_DOT = "hydration-asset::hydration::5" as TokenId;
		const transfer = (totalIn: bigint, received: bigint): Props => ({
			signer: "account-1",
			route: {
				kind: "xcm-transfer",
				origin: "pah",
				destination: "hydration",
				tokenIdIn: DOT,
				tokenIdOut: HYDRATION_DOT,
			} as SwapRoute,
			tokenIn: { id: DOT, decimals: 10 },
			tokenOut: { id: HYDRATION_DOT, decimals: 10 },
			totalIn,
			plancksOut: received,
			deliveryFee: { tokenId: DOT, plancks: 305_000_000n },
			destinationFee: undefined,
			priceImpact: undefined,
		});

		it("asks to confirm when fees take more than 15% of what you send", () => {
			const { result } = renderHook(useSwapRisk, {
				initialProps: transfer(1_000_000_000n, 995_000_000n),
			});
			expect(result.current.risk).toEqual({
				level: "confirm",
				losses: [{ kind: "fees", ratio: 0.31 }],
				headline: { kind: "fees", ratio: 0.31 },
				cause: "delivery-fee",
			});
			expect(result.current.transferFees).toEqual({
				fees: [{ tokenId: DOT, plancks: 310_000_000n }],
				share: 0.31,
				isPartial: false,
			});
			expect(result.current.isAcknowledged).toBe(false);
		});

		it.each([
			[1_700_000_000n, "confirm", 0.179411],
			[1_800_000_000n, "confirm", 0.169444],
			[2_000_000_000n, "confirm", 0.1525],
			[2_100_000_000n, "warn", 0.145238],
			[10_000_000_000n, "warn", 0.0305],
		])(
			"sets the level of a %s plancks transfer from the share its fees take",
			(amount, level, share) => {
				const { result } = renderHook(useSwapRisk, {
					initialProps: transfer(amount, amount),
				});
				expect(result.current.risk).toMatchObject({
					level,
					headline: { kind: "fees", ratio: share },
				});
				expect(result.current.transferFees?.share).toBe(share);
			},
		);

		it("asks to confirm a costly transfer of a token without a price", () => {
			valuation.stableValue = () => undefined;
			const { result } = renderHook(useSwapRisk, {
				initialProps: {
					...transfer(1_000_000_000n, 500_000_000n),
					deliveryFee: { tokenId: "native::pah" as TokenId, plancks: 1n },
					route: {
						kind: "xcm-transfer",
						origin: "pah",
						destination: "hydration",
						tokenIdIn: USDC,
						tokenIdOut: "hydration-asset::hydration::22" as TokenId,
					} as SwapRoute,
					tokenIn: { id: USDC, decimals: 6 },
					tokenOut: {
						id: "hydration-asset::hydration::22" as TokenId,
						decimals: 6,
					},
				},
			});
			expect(result.current.risk).toMatchObject({
				level: "confirm",
				headline: { kind: "fees", ratio: 0.5 },
			});
			expect(result.current.transferFees).toMatchObject({
				share: 0.5,
				isPartial: true,
			});
			expect(result.current.isAssessing).toBe(false);
			expect(result.current.isAcknowledged).toBe(false);
		});

		it("lets a transfer through when fees stay under 3%", () => {
			const { result } = renderHook(useSwapRisk, {
				initialProps: transfer(100_000_000_000n, 99_995_000_000n),
			});
			expect(result.current.risk).toEqual({ level: "none" });
		});

		it("waits for the values it compares", () => {
			valuation.isLoading = true;
			const { result } = renderHook(useSwapRisk, {
				initialProps: transfer(1_000_000_000n, 995_000_000n),
			});
			expect(result.current.isAssessing).toBe(true);
		});
	});

	it("blames the destination fee for a Hydration swap that loses value to it", () => {
		const HYDRATION_DOT = "hydration-asset::hydration::5" as TokenId;
		const DOT = "native::pah" as TokenId;
		const { result } = renderHook(useSwapRisk, {
			initialProps: {
				signer: "account-1",
				route: {
					kind: "xcm-destination-swap",
					origin: "hydration",
					destination: "pah",
					tokenIdIn: HYDRATION_DOT,
					tokenIdOut: USDC,
				} as SwapRoute,
				tokenIn: { id: HYDRATION_DOT, decimals: 10 },
				tokenOut: { id: USDC, decimals: 6 },
				totalIn: 100_000_000n,
				plancksOut: 82_610_000n,
				deliveryFee: { tokenId: HYDRATION_DOT, plancks: 0n },
				destinationFee: { tokenId: DOT, plancks: 17_000_000n },
				priceImpact: -0.0001,
			},
		});
		expect(result.current.risk).toMatchObject({
			headline: { kind: "value-loss", ratio: 0.1739 },
			cause: "destination-fee",
		});
	});
});
