import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionFeeSummaryRow } from "./TransactionFeeSummaryRow";

const PAS = { id: "native::pasah", symbol: "PAS", decimals: 10 };
const USDT = { id: "asset::pasah::1984", symbol: "USDt", decimals: 6 };

const transaction = vi.hoisted(() => ({
	feeEstimate: null as bigint | null,
	isLoadingFeeEstimate: false,
	feeTokens: [] as { id: string; symbol: string; decimals: number }[],
	insufficientBalances: {} as Record<string, string>,
}));

beforeEach(() => {
	transaction.feeEstimate = null;
	transaction.isLoadingFeeEstimate = false;
	transaction.feeTokens = [];
	transaction.insufficientBalances = {};
});

afterEach(cleanup);

vi.mock("./TransactionProvider", () => ({
	useTransaction: () => ({
		account: { platform: "polkadot", address: "5Signer" },
		feeEstimate: transaction.feeEstimate,
		feeToken: PAS,
		feeTokens: transaction.feeTokens,
		errorFeeEstimate: undefined,
		isLoadingFeeEstimate: transaction.isLoadingFeeEstimate,
		isLoadingFeeTokens: false,
		onFeeTokenChange: vi.fn(),
		insufficientBalances: transaction.insufficientBalances,
	}),
}));
vi.mock("../../components/TokenSelectDrawer", () => ({
	TokenSelectDrawer: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
		isOpen ? <div>{title}</div> : null,
}));

describe("TransactionFeeSummaryRow", () => {
	it("shows N/A when no fee can be estimated", () => {
		render(<TransactionFeeSummaryRow />);

		expect(screen.getByText("N/A")).toBeTruthy();
	});

	it("shows the fee once it is known", () => {
		transaction.feeEstimate = 13_000_000n;
		render(<TransactionFeeSummaryRow />);

		expect(screen.queryByText("N/A")).toBeNull();
		expect(screen.getByText(/0\.0013/)).toBeTruthy();
	});

	it("offers another fee token when the fee token cannot pay the fee", () => {
		transaction.feeEstimate = 13_000_000n;
		transaction.feeTokens = [PAS, USDT];
		transaction.insufficientBalances = {
			[PAS.id]: "Insufficient balance to pay for fee",
		};
		render(<TransactionFeeSummaryRow />);

		expect(screen.getByText(/Not enough PAS to pay the fee/)).toBeTruthy();
		fireEvent.click(screen.getByText("Pay with another token"));
		expect(screen.getByText("Select fee token")).toBeTruthy();
	});

	it("names the shortfall without a link when no other fee token exists", () => {
		transaction.feeEstimate = 13_000_000n;
		transaction.feeTokens = [PAS];
		transaction.insufficientBalances = {
			[PAS.id]: "Insufficient balance to pay for fee",
		};
		render(<TransactionFeeSummaryRow />);

		expect(screen.getByText(/Not enough PAS to pay the fee/)).toBeTruthy();
		expect(screen.queryByText("Pay with another token")).toBeNull();
	});

	it("stays quiet about the fee when the amount alone exceeds the balance", () => {
		transaction.feeEstimate = 13_000_000n;
		transaction.feeTokens = [PAS, USDT];
		transaction.insufficientBalances = { [PAS.id]: "Insufficient balance" };
		render(<TransactionFeeSummaryRow />);

		expect(screen.queryByText(/to pay the fee/)).toBeNull();
	});
});
