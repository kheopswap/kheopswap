import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionFeeSummaryValue } from "./TransactionFeeSummaryValue";

const transaction = vi.hoisted(() => ({
	feeEstimate: null as bigint | null,
	isLoadingFeeEstimate: false,
}));

beforeEach(() => {
	transaction.feeEstimate = null;
	transaction.isLoadingFeeEstimate = false;
});

afterEach(cleanup);

vi.mock("./TransactionProvider", () => ({
	useTransaction: () => ({
		account: { platform: "polkadot", address: "5Signer" },
		feeEstimate: transaction.feeEstimate,
		feeToken: { id: "native::pasah", symbol: "PAS", decimals: 10 },
		feeTokens: [],
		errorFeeEstimate: undefined,
		isLoadingFeeEstimate: transaction.isLoadingFeeEstimate,
		isLoadingFeeTokens: false,
		onFeeTokenChange: vi.fn(),
		insufficientBalances: {},
	}),
}));
vi.mock("../../components/TokenSelectDrawer", () => ({
	TokenSelectDrawer: () => null,
}));

describe("TransactionFeeSummaryValue", () => {
	it("shows N/A when no fee can be estimated", () => {
		render(<TransactionFeeSummaryValue />);

		expect(screen.getByText("N/A")).toBeTruthy();
	});

	it("shows the fee once it is known", () => {
		transaction.feeEstimate = 13_000_000n;
		render(<TransactionFeeSummaryValue />);

		expect(screen.queryByText("N/A")).toBeNull();
		expect(screen.getByText(/0\.0013/)).toBeTruthy();
	});
});
