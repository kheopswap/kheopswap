import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import { TransactionFeeSummaryValue } from "./TransactionFeeSummaryValue";

const state = vi.hoisted(() => ({ isCallFeeEstimated: false }));

vi.mock("./TransactionProvider", () => ({
	useTransaction: () => ({
		account: { platform: "polkadot", address: "account" },
		feeEstimate: 20_000_000n,
		feeToken: KNOWN_TOKENS_MAP["native::pah"],
		feeTokens: [KNOWN_TOKENS_MAP["native::pah"]],
		errorFeeEstimate: null,
		isLoadingFeeEstimate: false,
		isCallFeeEstimated: state.isCallFeeEstimated,
		isLoadingFeeTokens: false,
		onFeeTokenChange: () => {},
		insufficientBalances: {},
	}),
}));

vi.mock("../../components/TokenSelectDrawer", () => ({
	TokenSelectDrawer: () => null,
}));

afterEach(cleanup);

describe("TransactionFeeSummaryValue", () => {
	it("marks the fee of the placeholder transaction as an estimate", () => {
		state.isCallFeeEstimated = false;
		const { container } = render(<TransactionFeeSummaryValue />);

		expect(container.textContent).toBe("0.002 DOT (est.)");
		expect(container.firstElementChild?.className).toContain("text-muted");
	});

	it("shows the fee of the transaction to sign as it is", () => {
		state.isCallFeeEstimated = true;
		const { container } = render(<TransactionFeeSummaryValue />);

		expect(container.textContent).toBe("0.002 DOT");
		expect(container.firstElementChild?.className).not.toContain("text-muted");
	});
});
