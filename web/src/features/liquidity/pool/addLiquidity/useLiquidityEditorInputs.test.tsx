import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddLiquidityProvider } from "./AddLiquidityProvider";
import { useAddLiquidityExtrinsic } from "./useAddLiquidityExtrinsic";
import { useLiquidityEditorInputs } from "./useLiquidityEditorInputs";

const native = { id: "native::pasah", symbol: "PAS", decimals: 10 };
const asset = { id: "asset::pasah::1984", symbol: "USDT", decimals: 6 };

const page = vi.hoisted(() => ({
	reserves: [100n * 10n ** 10n, 50_000_000n] as [bigint, bigint] | null,
	accountBalances: [10n ** 12n, 10n ** 9n] as [bigint, bigint],
	feeEstimate: 10n as bigint | null,
	assetExistentialDeposit: 1n as bigint | undefined,
}));

beforeEach(() => {
	page.reserves = [100n * 10n ** 10n, 50_000_000n];
	page.accountBalances = [10n ** 12n, 10n ** 9n];
	page.feeEstimate = 10n;
	page.assetExistentialDeposit = 1n;
	vi.mocked(useAddLiquidityExtrinsic).mockClear();
});

vi.mock("../LiquidityPoolPageProvider", () => ({
	useLiquidityPoolPage: () => ({
		assetHub: { id: "pasah" },
		pool: {},
		nativeToken: native,
		assetToken: asset,
		isLoadingToken: false,
		reserves: page.reserves,
		accountBalances: page.accountBalances,
		isLoadingAccountBalances: false,
		resolvedSubstrateAddress: "5Grwva",
		lpSlippage: 0.005,
	}),
}));
vi.mock("../../../transaction/TransactionProvider", () => ({
	useTransaction: () => ({
		feeEstimate: page.feeEstimate,
		feeToken: native,
		insufficientBalances: {},
	}),
}));
vi.mock("./useAddLiquidityExtrinsic", () => ({
	useAddLiquidityExtrinsic: vi.fn(() => ({ data: null })),
}));
vi.mock("../../../../hooks/useExistentialDeposit", () => ({
	useExistentialDeposit: ({ tokenId }: { tokenId: string }) => ({
		data: tokenId === asset.id ? page.assetExistentialDeposit : 1n,
	}),
}));

const typeAmount = (
	handler: (e: FormEvent<HTMLInputElement>) => void,
	value: string,
) =>
	act(() =>
		handler({ currentTarget: { value } } as FormEvent<HTMLInputElement>),
	);

const lastExtrinsicAmounts = () => {
	const calls = vi.mocked(useAddLiquidityExtrinsic).mock.calls;
	const props = calls[calls.length - 1]?.[0];
	return [props?.amountNative, props?.amountAsset];
};

const renderWithInputs = () => {
	const rendered = renderHook(useLiquidityEditorInputs, {
		wrapper: AddLiquidityProvider,
	});
	rendered.result.current.refInput1.current = document.createElement("input");
	rendered.result.current.refInput2.current = document.createElement("input");
	return rendered;
};

const clickMax = (
	result: { current: ReturnType<typeof useLiquidityEditorInputs> },
	side: "token1" | "token2",
) => act(() => result.current.handleMaxClick(side)());

describe("useLiquidityEditorInputs", () => {
	it("flags a paired amount below one unit and builds no call", () => {
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput("token1"), "0.0000000001");

		expect(result.current.liquidityToAdd).toEqual([1n, 0n]);
		expect(lastExtrinsicAmounts()).toEqual([undefined, undefined]);
		expect(result.current.errorMessageAsset).toBe("Less than 0.000001 USDT");
		expect(result.current.errorMessageNative).toBeUndefined();
	});

	it("adds both sides once the paired amount reaches one unit", () => {
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput("token1"), "2");

		expect(result.current.liquidityToAdd).toEqual([
			20_000_000_000n,
			1_000_000n,
		]);
		expect(lastExtrinsicAmounts()).toEqual([20_000_000_000n, 1_000_000n]);
		expect(result.current.errorMessageAsset).toBeUndefined();
	});

	it("asks for both amounts while the pool has no reserves", () => {
		page.reserves = [0n, 0n];
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput("token2"), "5");

		expect(result.current.liquidityToAdd).toEqual([0n, 5_000_000n]);
		expect(lastExtrinsicAmounts()).toEqual([undefined, undefined]);
		expect(result.current.errorMessageNative).toBe("Enter both amounts");
		expect(result.current.errorMessageAsset).toBeUndefined();

		typeAmount(result.current.handleTokensInput("token1"), "1");

		expect(result.current.liquidityToAdd).toEqual([
			10_000_000_000n,
			5_000_000n,
		]);
		expect(lastExtrinsicAmounts()).toEqual([10_000_000_000n, 5_000_000n]);
		expect(result.current.errorMessageNative).toBeUndefined();
	});

	it("pairs an amount typed before the reserves load once they arrive", () => {
		page.reserves = null;
		const { result, rerender } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput("token1"), "5");

		expect(result.current.liquidityToAdd).toEqual([50_000_000_000n, 0n]);
		expect(result.current.errorMessageAsset).toBe("Enter both amounts");

		page.reserves = [100n * 10n ** 10n, 50_000_000n];
		rerender();

		expect(result.current.liquidityToAdd).toEqual([
			50_000_000_000n,
			2_500_000n,
		]);
		expect(lastExtrinsicAmounts()).toEqual([50_000_000_000n, 2_500_000n]);
		expect(result.current.errorMessageAsset).toBeUndefined();
	});

	it("keeps a sub-unit pair flagged after the reserves load", () => {
		page.reserves = null;
		const { result, rerender } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput("token1"), "0.0000000001");

		page.reserves = [100n * 10n ** 10n, 50_000_000n];
		rerender();

		expect(result.current.liquidityToAdd).toEqual([1n, 0n]);
		expect(lastExtrinsicAmounts()).toEqual([undefined, undefined]);
		expect(result.current.errorMessageAsset).toBe("Less than 0.000001 USDT");
	});

	it("reports a one-sided amount above the balance", () => {
		page.reserves = [0n, 0n];
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput("token1"), "20000");

		expect(result.current.liquidityToAdd).toEqual([200_000_000_000_000n, 0n]);
		expect(lastExtrinsicAmounts()).toEqual([undefined, undefined]);
		expect(result.current.errorMessageNative).toBe("Insufficient balance");
		expect(result.current.errorMessageAsset).toBe("Enter both amounts");
	});

	it("estimates the fee from an existential-deposit call before an amount is typed", () => {
		renderHook(useLiquidityEditorInputs, { wrapper: AddLiquidityProvider });

		expect(vi.mocked(useAddLiquidityExtrinsic)).toHaveBeenCalledWith(
			expect.objectContaining({ amountNative: 1n, amountAsset: 1n }),
		);
	});

	it("offers no max while the fee is unknown", () => {
		page.feeEstimate = null;
		const { result } = renderWithInputs();

		clickMax(result, "token1");

		expect(result.current.liquidityToAdd).toBeNull();
		expect(result.current.refInput1.current?.value).toBe("");
	});

	it("offers no max while the other side's existential deposit is unknown", () => {
		page.assetExistentialDeposit = undefined;
		page.accountBalances = [10n ** 12n, 1_000_000n];
		const { result } = renderWithInputs();

		clickMax(result, "token1");
		clickMax(result, "token2");

		expect(result.current.liquidityToAdd).toBeNull();
	});

	it("keeps twice the fee and the existential deposit out of the native max", () => {
		const { result } = renderWithInputs();

		clickMax(result, "token1");

		expect(result.current.liquidityToAdd).toEqual([
			999_999_999_979n,
			49_999_999n,
		]);
		expect(result.current.refInput1.current?.value).toBe("99.9999999979");
		expect(result.current.refInput2.current?.value).toBe("49.999999");
	});

	it("caps the native max by the asset balance", () => {
		page.accountBalances = [10n ** 12n, 1_000_000n];
		const { result } = renderWithInputs();

		clickMax(result, "token1");

		expect(result.current.liquidityToAdd).toEqual([19_999_980_000n, 999_999n]);
	});

	it("caps the asset max by the native balance net of its margin", () => {
		const { result } = renderWithInputs();

		clickMax(result, "token2");

		expect(result.current.liquidityToAdd).toEqual([
			999_999_999_979n,
			49_999_999n,
		]);
	});

	it("offers zero when the balance is below the margin", () => {
		page.accountBalances = [15n, 10n ** 9n];
		const { result } = renderWithInputs();

		clickMax(result, "token1");

		expect(result.current.liquidityToAdd).toEqual([0n, 0n]);
		expect(result.current.refInput1.current?.value).toBe("0");
	});
});
