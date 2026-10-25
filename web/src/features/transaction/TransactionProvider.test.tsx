import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainId } from "../../registry/chains/types";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import {
	addTransaction,
	dismissTransaction,
} from "../../state/transactions/transactionStore";
import type {
	TransactionRecord,
	TransactionStatus,
} from "../../state/transactions/types";
import {
	getSimulationVerdict,
	TransactionDryRunSummaryValue,
} from "./TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "./TransactionFeeSummaryValue";
import {
	getTokenSpending,
	type SubmitGate,
	TransactionProvider,
	useTransaction,
} from "./TransactionProvider";
import { TransactionSubmitButton } from "./TransactionSubmitButton";

const balanceCheck = vi.hoisted(() => ({
	insufficientBalances: {} as Record<string, string>,
	isLoadingBalances: false,
}));

const ethereum = vi.hoisted(() => ({
	isEthereumNetworkMismatch: false,
	platform: "polkadot" as "polkadot" | "ethereum",
}));

const fees = vi.hoisted(() => ({
	options: { asset: undefined, nonce: 1 } as {
		asset: object | undefined;
		nonce: number;
	},
	isCallFeeEstimated: true,
	feeEstimate: 1n as bigint | null,
}));

const dryRun = vi.hoisted(() => ({
	data: undefined as unknown,
	isLoading: false,
	isFetching: false,
	lastProps: undefined as { enabled?: boolean } | undefined,
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
	balanceCheck.isLoadingBalances = false;
	ethereum.isEthereumNetworkMismatch = false;
	ethereum.platform = "polkadot";
	fees.options = { asset: undefined, nonce: 1 };
	fees.isCallFeeEstimated = true;
	fees.feeEstimate = 1n;
	dryRun.data = successfulDryRun;
	dryRun.isLoading = false;
	dryRun.isFetching = false;
});

vi.mock("../../hooks/useDryRun", () => ({
	useDryRun: (props: { enabled?: boolean }) => {
		dryRun.lastProps = props;
		return {
			data: dryRun.data,
			isLoading: dryRun.isLoading,
			isFetching: dryRun.isFetching,
		};
	},
}));

afterEach(cleanup);

vi.mock("../../hooks/useDryRunError", () => ({
	useDryRunError: () => ({ data: null }),
}));

vi.mock("./useTransactionEthereum", () => ({
	useTransactionEthereum: () => ({
		account: { platform: ethereum.platform, address: "5Signer" },
		isEthereumAccount: ethereum.platform === "ethereum",
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
			feeEstimate: fees.feeEstimate,
			isCallFeeEstimated: fees.isCallFeeEstimated,
			feeToken: KNOWN_TOKENS_MAP["native::pah"],
			feeTokens: [],
			options: fees.options,
		}),
	};
});

vi.mock("./useTransactionBalanceCheck", async (importOriginal) => ({
	...(await importOriginal<typeof import("./useTransactionBalanceCheck")>()),
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
	(
		submitGate?: SubmitGate,
		chainId: ChainId = "pah",
		call: object | null = {},
	): FC<PropsWithChildren> =>
	({ children }) => (
		<TransactionProvider
			call={call as never}
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

	it("keeps submit disabled while only the fake call's fee is known", () => {
		fees.isCallFeeEstimated = false;
		expect(renderTransaction({ status: "open" }).canSubmit).toBe(false);
	});

	it("keeps submit disabled for an Ethereum account while only the fake call's fee is known", () => {
		ethereum.platform = "ethereum";
		fees.isCallFeeEstimated = false;
		expect(renderTransaction({ status: "open" }).canSubmit).toBe(false);
	});

	it("keeps submit disabled when the real fee cannot be converted into the fee token", () => {
		fees.feeEstimate = null;
		expect(renderTransaction({ status: "open" }).canSubmit).toBe(false);
	});

	it("reports loading and keeps submit disabled while the gate is pending", () => {
		const transaction = renderTransaction({ status: "pending" });
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.isLoading).toBe(true);
	});
});

describe("TransactionProvider while an earlier transaction holds the nonce", () => {
	const recordWith = (
		status: TransactionStatus,
		overrides: Partial<TransactionRecord> = {},
	): TransactionRecord =>
		({
			id: `earlier-${status}`,
			createdAt: 0,
			status,
			txEvents: [{ type: "pending" }],
			account: { platform: "polkadot", address: "5Signer" },
			nonce: 1,
			feeEstimate: 1n,
			feeToken: KNOWN_TOKENS_MAP["native::pah"],
			title: "Transfer",
			type: "transfer",
			...overrides,
		}) as unknown as TransactionRecord;

	afterEach(() => {
		for (const status of [
			"pending",
			"broadcasted",
			"inBlock",
			"finalized",
			"expired",
			"failed",
		] as const)
			dismissTransaction(`earlier-${status}`);
	});

	it.each(["pending", "broadcasted"] as const)(
		"holds submit while a %s transaction of the signer would reuse the nonce",
		(status) => {
			addTransaction(recordWith(status));
			expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
		},
	);

	it("holds submit while the chain still reports the nonce of a transaction in a block", () => {
		addTransaction(recordWith("inBlock"));
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("opens submit once the chain nonce has moved past the earlier transaction", () => {
		addTransaction(recordWith("finalized"));
		fees.options = { asset: undefined, nonce: 2 };
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(true);
	});

	it("opens submit after a transaction that expired or was rejected before inclusion", () => {
		addTransaction(recordWith("expired"));
		addTransaction(
			recordWith("failed", {
				txEvents: [
					{ type: "pending" },
					{ type: "error", error: new Error("rejected") },
				],
			}),
		);
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(true);
	});

	it("holds submit while the chain nonce is unknown", () => {
		fees.options = undefined as never;
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("ignores pending transactions of other signers and chains", () => {
		addTransaction(
			recordWith("broadcasted", {
				account: { platform: "polkadot", address: "5Other" } as never,
			}),
		);
		addTransaction(
			recordWith("pending", {
				feeToken: KNOWN_TOKENS_MAP["native::hydration"],
			}),
		);
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(true);
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
		dryRun.isFetching = true;
		const transaction = renderTransaction(undefined, "pah");
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.isLoading).toBe(true);
	});

	it("shows the dry run as loading while the balances it depends on load", () => {
		balanceCheck.isLoadingBalances = true;
		const transaction = renderTransaction(undefined, "pah");
		expect(transaction.isLoadingDryRun).toBe(true);
		expect(transaction.canSubmit).toBe(false);
	});

	it("does not run the dry run while the balances it depends on load", () => {
		balanceCheck.isLoadingBalances = true;
		renderTransaction(undefined, "pah");
		expect(dryRun.lastProps).toMatchObject({ enabled: false });

		balanceCheck.isLoadingBalances = false;
		renderTransaction(undefined, "pah");
		expect(dryRun.lastProps).toMatchObject({ enabled: true });
	});

	it("keeps submit disabled while a cached dry run is refetched for new inputs", () => {
		dryRun.isFetching = true;
		const transaction = renderTransaction(undefined, "pah");
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.isLoading).toBe(true);
	});

	it("blocks submit when the Asset Hub dry run rejects the call", () => {
		dryRun.data = failedDryRun;
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("keeps the keep-alive shortfall despite a successful Asset Hub dry run, which does not charge the fee", () => {
		balanceCheck.insufficientBalances = {
			"native::pah": "Insufficient balance to keep account alive",
		};
		const transaction = renderTransaction(undefined, "pah");
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.insufficientBalances).toEqual(
			balanceCheck.insufficientBalances,
		);
	});

	it("keeps the keep-alive shortfall when the dry run is not conclusive", () => {
		balanceCheck.insufficientBalances = {
			"hydration-asset::hydration::5":
				"Insufficient balance to keep account alive",
		};
		const transaction = renderTransaction(undefined, "hydration");
		expect(transaction.canSubmit).toBe(false);
		expect(transaction.insufficientBalances).toEqual(
			balanceCheck.insufficientBalances,
		);
	});

	it("blocks submit when the Hydration dry run rejects the call", () => {
		dryRun.data = failedDryRun;
		expect(renderTransaction(undefined, "hydration").canSubmit).toBe(false);
	});

	it("blocks submit when the dry run rejects a call whose fee is paid in an asset", () => {
		dryRun.data = failedDryRun;
		fees.options = {
			asset: { parents: 1, interior: { type: "Here" } },
			nonce: 1,
		};
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
	});

	it("blocks submit for an Ethereum account when the dry run rejects the call", () => {
		dryRun.data = failedDryRun;
		ethereum.platform = "ethereum";
		expect(renderTransaction(undefined, "pah").canSubmit).toBe(false);
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
	const renderDryRun = (chainId: ChainId = "pah", call: object | null = {}) => {
		const Wrapper = getWrapper(undefined, chainId, call);
		render(
			<Wrapper>
				<TransactionDryRunSummaryValue />
			</Wrapper>,
		);
	};

	it("reads Success when the Asset Hub dry run succeeds with a native fee the account can pay", () => {
		renderDryRun();
		expect(screen.getByText("Success")).toBeInTheDocument();
	});

	it("reads Succeeds before fees, muted, when the native fee check fails despite a successful dry run", () => {
		balanceCheck.insufficientBalances = {
			"native::pah": "Insufficient balance to keep account alive",
		};
		renderDryRun();
		expect(screen.queryByText("Success")).toBeNull();
		expect(screen.getByText("Succeeds before fees").parentElement).toHaveClass(
			"text-muted",
		);
	});

	it("reads Failed when the dry run rejects the call", () => {
		dryRun.data = failedDryRun;
		renderDryRun();
		expect(screen.getByText("Failed").parentElement).toHaveClass("text-warn");
	});

	it("shows a muted placeholder when there is no call to simulate", () => {
		renderDryRun("pah", null);
		expect(screen.getByText("Nothing to simulate")).toHaveClass("text-muted");
	});

	it("reads Succeeds before fees, muted, when the fee is paid in an asset", () => {
		fees.options = {
			asset: { parents: 1, interior: { type: "Here" } },
			nonce: 1,
		};
		renderDryRun();
		expect(screen.queryByText("Success")).toBeNull();
		expect(screen.getByText("Succeeds before fees").parentElement).toHaveClass(
			"text-muted",
		);
	});

	it("reads Succeeds before fees on Hydration, which charges the fee in the account's currency", () => {
		renderDryRun("hydration");
		expect(screen.getByText("Succeeds before fees")).toBeInTheDocument();
	});
});

describe("getSimulationVerdict on a failed dry run", () => {
	const failed = failedDryRun as never;

	it("explains a failure with the shortfall the amount field already reports", () => {
		expect(
			getSimulationVerdict({
				dryRun: failed,
				isDryRunConclusive: false,
				dryRunErrorMessage: "Insufficient balance to keep account alive",
				insufficientBalances: { "native::pah": "Insufficient balance" },
			}).detail,
		).toBe("Insufficient balance");
	});

	it("explains a failure with the chain's reason when the balances suffice", () => {
		expect(
			getSimulationVerdict({
				dryRun: failed,
				isDryRunConclusive: false,
				dryRunErrorMessage: "Insufficient balance to keep account alive",
				insufficientBalances: {},
			}).detail,
		).toBe("Insufficient balance to keep account alive");
	});

	it("falls back to the raw dispatch error without a resolved message", () => {
		expect(
			getSimulationVerdict({
				dryRun: failed,
				isDryRunConclusive: false,
				dryRunErrorMessage: null,
				insufficientBalances: {},
			}).detail,
		).toBe("Token");
	});
});
