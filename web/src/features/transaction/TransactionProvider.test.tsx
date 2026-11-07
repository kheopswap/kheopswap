import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainId } from "../../registry/chains/types";
import { TransactionDryRunSummaryValue } from "./TransactionDryRunValue";
import {
	getTokenSpending,
	type SubmitGate,
	TransactionProvider,
	useTransaction,
} from "./TransactionProvider";

const successfulDryRun = {
	success: true,
	value: { execution_result: { success: true } },
};

const failedDryRun = {
	success: true,
	value: {
		execution_result: {
			success: false,
			value: { error: { type: "Token", value: { type: "FundsUnavailable" } } },
		},
	},
};

const balanceCheck = vi.hoisted(() => ({
	insufficientBalances: {} as Record<string, string>,
	isLoadingBalances: false,
}));

const ethereum = vi.hoisted(() => ({
	platform: "polkadot" as "polkadot" | "ethereum",
}));

const fees = vi.hoisted(() => ({
	options: { asset: undefined } as { asset: object | undefined } | undefined,
	feeEstimate: 1n as bigint | null,
	errorFeeEstimate: undefined as Error | undefined,
	dryRun: undefined as unknown,
}));

beforeEach(() => {
	balanceCheck.insufficientBalances = {};
	balanceCheck.isLoadingBalances = false;
	ethereum.platform = "polkadot";
	fees.options = { asset: undefined };
	fees.feeEstimate = 1n;
	fees.errorFeeEstimate = undefined;
	fees.dryRun = successfulDryRun;
});

afterEach(cleanup);

Element.prototype.animate ??= () =>
	({ play() {}, effect: { updateTiming() {} } }) as unknown as Animation;

vi.mock("../../hooks/useDryRunError", () => ({
	useDryRunError: () => ({ data: null }),
}));

vi.mock("./useTransactionEthereum", () => ({
	useTransactionEthereum: () => ({
		account: { platform: ethereum.platform, address: "5Signer" },
		isEthereumAccount: ethereum.platform === "ethereum",
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
		feeEstimate: fees.feeEstimate,
		errorFeeEstimate: fees.errorFeeEstimate,
		feeToken: { id: "native::pah" },
		options: fees.options,
		dryRun: fees.dryRun,
	}),
}));

vi.mock("./useTransactionBalanceCheck", () => ({
	useTransactionBalanceCheck: () => ({
		insufficientBalances: balanceCheck.insufficientBalances,
		isLoadingBalances: balanceCheck.isLoadingBalances,
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

const nativeFeeShortfall = {
	"native::pah": "Insufficient balance to keep account alive",
};

describe("TransactionProvider submit gate", () => {
	it("lets a successful dry run enable submit when no gate is given", () => {
		expect(renderTransaction().canSubmit).toBe(true);
	});

	it("lets a successful dry run enable submit through an open gate", () => {
		expect(renderTransaction({ status: "open" }).canSubmit).toBe(true);
	});

	it("keeps an Ethereum submit disabled until the transaction options are ready", () => {
		ethereum.platform = "ethereum";
		fees.options = undefined;
		expect(renderTransaction().canSubmit).toBe(false);
		fees.options = { asset: undefined };
		expect(renderTransaction().canSubmit).toBe(true);
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
	const hydrationFeeShortfall = {
		"hydration-asset::hydration::5": "Insufficient balance to pay for fee",
	};

	it("keeps submit disabled on Hydration when the fee currency falls short, despite a successful dry run", () => {
		balanceCheck.insufficientBalances = hydrationFeeShortfall;
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(false);
	});

	it("enables submit on Hydration once balances cover the fee", () => {
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(true);
	});

	it("keeps submit disabled on Asset Hub when the native fee falls short, despite a successful dry run", () => {
		balanceCheck.insufficientBalances = nativeFeeShortfall;
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("keeps submit disabled on Asset Hub while balances load, despite a successful dry run", () => {
		balanceCheck.isLoadingBalances = true;
		const transaction = renderTransaction(undefined, "pah");
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.isLoading).toBe(true);
	});
});

describe("TransactionProvider failed dry run", () => {
	beforeEach(() => {
		fees.dryRun = failedDryRun;
	});

	it("blocks submit on Asset Hub with a native fee", () => {
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("blocks submit on Asset Hub with the fee paid in an asset", () => {
		fees.options = { asset: { parents: 1, interior: { type: "Here" } } };
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("blocks submit on Hydration", () => {
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(false);
	});

	it("blocks submit for an Ethereum account", () => {
		ethereum.platform = "ethereum";
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});
});

describe("TransactionProvider simulation certainty", () => {
	it("is conclusive on Asset Hub once the native fee is known payable", () => {
		expect(renderTransaction(undefined, "pah").isDryRunConclusive).toBe(true);
	});

	it("is not conclusive while balances load", () => {
		balanceCheck.isLoadingBalances = true;
		expect(renderTransaction(undefined, "pah").isDryRunConclusive).toBe(false);
	});

	it("is not conclusive when the fee estimate failed", () => {
		fees.errorFeeEstimate = new Error("fee estimate failed");
		expect(renderTransaction(undefined, "pah").isDryRunConclusive).toBe(false);
	});

	it("is not conclusive before the nonce makes the fee options available", () => {
		fees.options = undefined;
		expect(renderTransaction(undefined, "pah").isDryRunConclusive).toBe(false);
	});

	it("is not conclusive without a converted fee estimate", () => {
		fees.feeEstimate = null;
		expect(renderTransaction(undefined, "pah").isDryRunConclusive).toBe(false);
	});
});

describe("getTokenSpending", () => {
	it("keeps a native sender alive, as its transfer and swap calls do", () => {
		expect(getTokenSpending({ id: "native::pah", type: "native" }, 5n)).toEqual(
			{ "native::pah": { plancks: 5n, allowDeath: false } },
		);
	});

	it("lets an asset sender spend its whole balance", () => {
		expect(
			getTokenSpending({ id: "asset::pah::1984", type: "asset" }, 5n),
		).toEqual({ "asset::pah::1984": { plancks: 5n, allowDeath: true } });
	});
});

describe("TransactionDryRunSummaryValue", () => {
	const renderDryRun = (chainId: ChainId = "pah") => {
		const Wrapper = getWrapper(undefined, chainId);
		render(
			<Wrapper>
				<TransactionDryRunSummaryValue />
			</Wrapper>,
		);
	};

	it("reads Success when the Asset Hub dry run succeeds and the native fee is covered", () => {
		renderDryRun();
		expect(screen.getByText("Success")).toBeInTheDocument();
	});

	it("reads Succeeds before fees, muted, when the native fee falls short on Asset Hub", () => {
		balanceCheck.insufficientBalances = nativeFeeShortfall;
		renderDryRun();
		expect(screen.queryByText("Success")).toBeNull();
		expect(screen.getByText("Succeeds before fees").parentElement).toHaveClass(
			"text-muted",
		);
	});

	it("reads Succeeds before fees when the fee is paid in an asset", () => {
		fees.options = { asset: { parents: 1, interior: { type: "Here" } } };
		renderDryRun();
		expect(screen.getByText("Succeeds before fees")).toBeInTheDocument();
	});

	it("reads Succeeds before fees on Hydration, which charges the fee outside the simulation", () => {
		renderDryRun("hydration");
		expect(screen.getByText("Succeeds before fees")).toBeInTheDocument();
	});

	it("shows only the placeholder while balances load, despite a successful dry run", () => {
		balanceCheck.isLoadingBalances = true;
		renderDryRun();
		expect(screen.getByText("Success")).toHaveAttribute("aria-hidden", "true");
		expect(screen.queryByText("Succeeds before fees")).toBeNull();
	});

	it("reads Failed when the dry run rejects the call", () => {
		fees.dryRun = failedDryRun;
		renderDryRun();
		expect(screen.getByText("Failed").parentElement).toHaveClass("text-warn");
	});
});
