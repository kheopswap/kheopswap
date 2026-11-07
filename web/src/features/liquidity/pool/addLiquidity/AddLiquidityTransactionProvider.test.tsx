import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionProvider } from "../../../transaction/TransactionProvider";
import { AddLiquidityTransactionProvider } from "./AddLiquidityTransactionProvider";

const call = { decodedCall: "real" };
const fakeCall = { decodedCall: "fake" };

vi.mock("../../../transaction/TransactionProvider", () => ({
	TransactionProvider: vi.fn(() => null),
}));
vi.mock("../LiquidityPoolPageProvider", () => ({
	useLiquidityPoolPage: () => ({
		assetHub: { id: "pasah" },
		account: { id: "account" },
		nativeToken: { id: "native::pasah", symbol: "PAS" },
		assetToken: { id: "asset::pasah::1337", symbol: "USDC" },
	}),
}));
vi.mock("./AddLiquidityProvider", () => ({
	useAddLiquidity: () => ({
		liquidityToAdd: null,
		call,
		fakeCall,
		onReset: () => {},
	}),
}));

describe("AddLiquidityTransactionProvider", () => {
	it("estimates the fee from the existential-deposit call while the real call is missing", () => {
		render(<AddLiquidityTransactionProvider />);

		expect(vi.mocked(TransactionProvider)).toHaveBeenCalledWith(
			expect.objectContaining({ call, fakeCall }),
			undefined,
		);
	});
});
