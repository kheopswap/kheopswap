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
}));

beforeEach(() => {
	page.reserves = [100n * 10n ** 10n, 50_000_000n];
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
		accountBalances: [10n ** 12n, 10n ** 9n],
		isLoadingAccountBalances: false,
		resolvedSubstrateAddress: "5Grwva",
		lpSlippage: 0.005,
	}),
}));
vi.mock("../../../transaction/TransactionProvider", () => ({
	useTransaction: () => ({
		feeEstimate: 10n,
		feeToken: native,
		insufficientBalances: {},
	}),
}));
vi.mock("./useAddLiquidityExtrinsic", () => ({
	useAddLiquidityExtrinsic: vi.fn(() => ({ data: null })),
}));
vi.mock("../../../../hooks/useExistentialDeposit", () => ({
	useExistentialDeposit: () => ({ data: 1n }),
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
});
