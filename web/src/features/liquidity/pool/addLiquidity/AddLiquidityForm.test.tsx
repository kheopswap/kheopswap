import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddLiquidityForm } from "./AddLiquidityForm";

const native = { id: "native::pasah", symbol: "PAS", decimals: 10 };
const asset = { id: "asset::pasah::1984", symbol: "USDT", decimals: 6 };

vi.mock("./useLiquidityEditorInputs", () => ({
	useLiquidityEditorInputs: () => ({
		amounts: ["1", "123456.123456"],
		nativeToken: native,
		assetToken: asset,
		tokens: { [native.id]: native, [asset.id]: asset },
		isLoadingToken: false,
		liquidityToAdd: null,
		accountBalances: undefined,
		isLoadingAccountBalances: false,
		handleTokensInput: () => () => {},
		handleMaxClick: () => () => {},
		errorMessageNative: undefined,
		errorMessageAsset: undefined,
		hintNative: null,
		hintAsset: null,
	}),
}));
vi.mock("../../../transaction/TransactionProvider", () => ({
	useTransaction: () => ({ onSubmit: () => {} }),
}));
vi.mock("../../../transaction/TransactionSubmitButton", () => ({
	TransactionSubmitButton: () => null,
}));
vi.mock("./AddLiquiditySummary", () => ({ AddLiquiditySummary: () => null }));
vi.mock("../../../../components/StablePrice", () => ({
	StablePrice: () => null,
}));
vi.mock("../../../../components/TokenSelectButton", () => ({
	TokenSelectButton: () => null,
}));

afterEach(cleanup);

describe("AddLiquidityForm", () => {
	it("shows the paired amount in a size that fits the box", () => {
		render(<AddLiquidityForm />);

		const assetInput =
			screen.getByLabelText<HTMLInputElement>("Asset token amount");
		expect(assetInput.value).toBe("123456.123456");
		expect(assetInput.className).toMatch(/text-\[18px\]/);
	});
});
