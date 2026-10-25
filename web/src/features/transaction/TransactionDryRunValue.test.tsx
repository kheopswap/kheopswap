import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getSimulationVerdict,
	TransactionDryRunSummaryValue,
} from "./TransactionDryRunValue";

vi.mock("./TransactionProvider", () => ({
	useTransaction: () => ({
		call: undefined,
		chainId: "pah",
		dryRun: undefined,
		errorDryRun: null,
		isLoadingDryRun: false,
		isDryRunConclusive: false,
		insufficientBalances: {},
	}),
}));

vi.mock("../../hooks/useDryRunError", () => ({
	useDryRunError: () => ({ data: null }),
}));

afterEach(cleanup);

describe("TransactionDryRunSummaryValue without a call", () => {
	it("reads Nothing to simulate while the form is incomplete", () => {
		render(<TransactionDryRunSummaryValue />);

		expect(screen.getByText("Nothing to simulate")).toHaveClass("text-muted");
	});

	it("reads Not run when the form blocks a complete transaction", () => {
		render(<TransactionDryRunSummaryValue isBlocked />);

		expect(screen.queryByText("Nothing to simulate")).toBeNull();
		expect(screen.getByText("Not run")).toHaveClass("text-muted");
	});
});

describe("getSimulationVerdict before fees", () => {
	it("points to the message under the amount for the fee and the account minimum", () => {
		const succeeded = {
			success: true,
			value: { execution_result: { success: true } },
		} as never;

		expect(
			getSimulationVerdict({
				dryRun: succeeded,
				isDryRunConclusive: false,
				dryRunErrorMessage: null,
				insufficientBalances: {},
			}).note,
		).toBe(
			"The simulation runs the call without charging its fee, so it cannot tell whether the fee can be paid. The message under the amount tells whether the fee and the account minimum can be paid.",
		);
	});
});
