import { renderHook } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainId } from "../../registry/chains/types";
import {
	type SubmitGate,
	TransactionProvider,
	useTransaction,
} from "./TransactionProvider";

const balanceCheck = vi.hoisted(() => ({
	insufficientBalances: {} as Record<string, string>,
}));

beforeEach(() => {
	balanceCheck.insufficientBalances = {};
});

vi.mock("./useTransactionEthereum", () => ({
	useTransactionEthereum: () => ({
		account: { platform: "polkadot", address: "5Signer" },
		isEthereumAccount: false,
		isEthereumNetworkMismatch: false,
		isSwitchingEthereumNetwork: false,
		nativeToken: undefined,
	}),
}));

vi.mock("./useTransactionFees", () => ({
	useTransactionFees: () => ({
		isResolvingSigner: false,
		isLoadingFeeEstimate: false,
		isLoadingDryRun: false,
		feeEstimate: 1n,
		feeToken: { id: "native::pah" },
		options: { asset: undefined },
		dryRun: {
			success: true,
			value: { execution_result: { success: true } },
		},
	}),
}));

vi.mock("./useTransactionBalanceCheck", () => ({
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

const renderTransaction = (
	submitGate?: SubmitGate,
	chainId: ChainId = "pah",
) => {
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
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
	return renderHook(() => useTransaction(), { wrapper }).result.current;
};

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

describe("TransactionProvider fee shortfall", () => {
	const feeShortfall = {
		"hydration-asset::hydration::5": "Insufficient balance to pay for fee",
	};

	it("keeps submit disabled on Hydration when the fee currency falls short, despite a successful dry run", () => {
		balanceCheck.insufficientBalances = feeShortfall;
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(false);
	});

	it("enables submit on Hydration once balances cover the fee", () => {
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(true);
	});

	it("keeps trusting a successful dry run on Asset Hub", () => {
		balanceCheck.insufficientBalances = feeShortfall;
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(true);
	});
});
