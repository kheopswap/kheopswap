import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { AddLiquidityProvider } from "./AddLiquidityProvider";
import { useLiquidityEditorInputs } from "./useLiquidityEditorInputs";

const native = { id: "native::pasah", symbol: "PAS", decimals: 10 };
const asset = { id: "asset::pasah::1984", symbol: "USDT", decimals: 6 };

vi.mock("../LiquidityPoolPageProvider", () => ({
	useLiquidityPoolPage: () => ({
		assetHub: { id: "pasah" },
		pool: {},
		nativeToken: native,
		assetToken: asset,
		isLoadingToken: false,
		reserves: [100n * 10n ** 10n, 50_000_000n],
		accountBalances: [10n ** 12n, 10n ** 9n],
		isLoadingAccountBalances: false,
		resolvedSubstrateAddress: "5Grwva",
		lpSlippage: 0.005,
	}),
}));
vi.mock("../../../transaction/TransactionProvider", () => ({
	useTransaction: () => ({
		feeEstimate: 100_000_000n,
		feeToken: native,
		insufficientBalances: {},
	}),
}));
vi.mock("./useAddLiquidityExtrinsic", () => ({
	useAddLiquidityExtrinsic: () => ({ data: null }),
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

describe("useLiquidityEditorInputs", () => {
	it("flags a paired amount below one unit instead of adding zero", () => {
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput(0), "0.0000000001");

		expect(result.current.amounts).toEqual(["0.0000000001", "0"]);
		expect(result.current.liquidityToAdd).toBeNull();
		expect(result.current.errorMessageAsset).toBe("Less than 0.000001 USDT");
		expect(result.current.errorMessageNative).toBeUndefined();
	});

	it("adds both sides once the paired amount reaches one unit", () => {
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		typeAmount(result.current.handleTokensInput(0), "2");

		expect(result.current.liquidityToAdd).toEqual([
			20_000_000_000n,
			1_000_000n,
		]);
		expect(result.current.errorMessageAsset).toBeUndefined();
	});

	it("says what the maxed side keeps when its own balance bounds the max", () => {
		const { result } = renderHook(useLiquidityEditorInputs, {
			wrapper: AddLiquidityProvider,
		});

		act(() => result.current.handleMaxClick(0)());

		expect(result.current.hintNative).toBe("0.02 PAS kept");
		expect(result.current.hintAsset).toBeNull();
	});
});
