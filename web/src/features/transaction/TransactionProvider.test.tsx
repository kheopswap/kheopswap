import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainId } from "../../registry/chains/types";
import { TransactionFeeSummaryValue } from "./TransactionFeeSummaryValue";
import {
	type SubmitGate,
	TransactionProvider,
	useTransaction,
} from "./TransactionProvider";
import { TransactionSubmitButton } from "./TransactionSubmitButton";

const balanceCheck = vi.hoisted(() => ({
	insufficientBalances: {} as Record<string, string>,
}));

const ethereum = vi.hoisted(() => ({
	isEthereumNetworkMismatch: false,
}));

const dryRun = vi.hoisted(() => ({
	data: undefined as unknown,
	isLoading: false,
}));

const successfulDryRun = {
	success: true,
	value: { execution_result: { success: true } },
};

const failedDryRun = {
	success: true,
	value: {
		execution_result: { success: false, value: { error: { type: "Token" } } },
	},
};

beforeEach(() => {
	balanceCheck.insufficientBalances = {};
	ethereum.isEthereumNetworkMismatch = false;
	dryRun.data = successfulDryRun;
	dryRun.isLoading = false;
});

vi.mock("../../hooks/useDryRun", () => ({
	useDryRun: () => ({ data: dryRun.data, isLoading: dryRun.isLoading }),
}));

afterEach(cleanup);

vi.mock("./useTransactionEthereum", () => ({
	useTransactionEthereum: () => ({
		account: { platform: "polkadot", address: "5Signer" },
		isEthereumAccount: false,
		isEthereumNetworkMismatch: ethereum.isEthereumNetworkMismatch,
		isSwitchingEthereumNetwork: false,
		nativeToken: undefined,
	}),
}));

vi.mock("./useTransactionFees", async () => {
	const { KNOWN_TOKENS_MAP } = await import("../../registry/tokens/tokens");
	return {
		useTransactionFees: () => ({
			isResolvingSigner: false,
			isLoadingFeeEstimate: false,
			isLoadingDryRun: false,
			feeEstimate: 1n,
			feeToken: KNOWN_TOKENS_MAP["native::pah"],
			feeTokens: [],
			options: { asset: undefined },
		}),
	};
});

vi.mock("./useTransactionBalanceCheck", async (importOriginal) => ({
	...(await importOriginal<typeof import("./useTransactionBalanceCheck")>()),
	useTransactionBalanceCheck: () => ({
		insufficientBalances: balanceCheck.insufficientBalances,
		isLoadingBalances: false,
		isLoadingExistentialDeposits: false,
		isLoadingFeeTokenBalance: false,
	}),
}));

vi.mock("./useTransactionSubmit", () => ({
	useTransactionSubmit: () => ({ onSubmit: vi.fn() }),
}));

const getWrapper =
	(submitGate?: SubmitGate, chainId: ChainId = "pah"): FC<PropsWithChildren> =>
	({ children }) => (
		<TransactionProvider
			call={{} as never}
			fakeCall={null}
			signer="signer"
			chainId={chainId}
			onReset={vi.fn()}
			submitGate={submitGate}
		>
			{children}
		</TransactionProvider>
	);

const renderTransaction = (submitGate?: SubmitGate, chainId: ChainId = "pah") =>
	renderHook(() => useTransaction(), {
		wrapper: getWrapper(submitGate, chainId),
	}).result.current;

const renderSubmitButton = (submitGate?: SubmitGate) => {
	const Wrapper = getWrapper(submitGate);
	render(
		<Wrapper>
			<TransactionSubmitButton>Swap</TransactionSubmitButton>
		</Wrapper>,
	);
	return screen.getByRole("button");
};

describe("TransactionFeeSummaryValue", () => {
	const renderFee = () => {
		const Wrapper = getWrapper();
		render(
			<Wrapper>
				<TransactionFeeSummaryValue />
			</Wrapper>,
		);
		return screen.getByText(/DOT/);
	};

	it("turns red when the fee itself cannot be paid", () => {
		balanceCheck.insufficientBalances = {
			"native::pah": "Insufficient balance to pay for fee",
		};
		expect(renderFee()).toHaveClass("text-error");
	});

	it("stays neutral when only the spent amount is short", () => {
		balanceCheck.insufficientBalances = {
			"native::pah": "Insufficient balance",
		};
		expect(renderFee()).not.toHaveClass("text-error");
	});
});

describe("TransactionSubmitButton on an Ethereum network mismatch", () => {
	beforeEach(() => {
		ethereum.isEthereumNetworkMismatch = true;
	});

	it("offers to switch network when the route is open", () => {
		expect(renderSubmitButton({ status: "open" })).toHaveTextContent(
			"Switch network",
		);
	});

	it("keeps the disabled action when the route is closed", () => {
		const button = renderSubmitButton({
			status: "closed",
			reason: "Ethereum accounts cannot send to Hydration yet",
		});
		expect(button).toHaveTextContent("Swap");
		expect(button).toBeDisabled();
	});
});

describe("TransactionProvider submit gate", () => {
	it("lets a successful dry run enable submit when no gate is given", () => {
		expect(renderTransaction().canSubmit).toBe(true);
	});

	it("lets a successful dry run enable submit through an open gate", () => {
		expect(renderTransaction({ status: "open" }).canSubmit).toBe(true);
	});

	it("keeps submit disabled behind a closed gate despite a successful dry run", () => {
		expect(
			renderTransaction({ status: "closed", reason: "assets trapped" })
				.canSubmit,
		).toBe(false);
	});

	it("reports loading and keeps submit disabled while the gate is pending", () => {
		const transaction = renderTransaction({ status: "pending" });
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.isLoading).toBe(true);
	});
});

describe("TransactionProvider dry run", () => {
	const feeShortfall = {
		"native::pah": "Insufficient balance to pay for fee",
	};

	it("keeps submit disabled on Hydration when the fee currency falls short, despite a successful dry run", () => {
		balanceCheck.insufficientBalances = {
			"hydration-asset::hydration::5": "Insufficient balance to pay for fee",
		};
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(false);
	});

	it("enables submit on Hydration once balances cover the fee", () => {
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(true);
	});

	it("does not let a successful dry run override a fee shortfall on Asset Hub", () => {
		balanceCheck.insufficientBalances = feeShortfall;
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("keeps submit disabled while the dry run reloads after a balance change", () => {
		dryRun.data = undefined;
		dryRun.isLoading = true;
		const transaction = renderTransaction(undefined, "pah");
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.isLoading).toBe(true);
	});

	it("blocks submit when the Asset Hub dry run rejects the call", () => {
		dryRun.data = failedDryRun;
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("ignores a failed dry run on Hydration, where fees are not simulated", () => {
		dryRun.data = failedDryRun;
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(true);
	});
});
