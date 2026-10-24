import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SwapSummary } from "./SwapSummary";

const swap = vi.hoisted(() => ({
	call: undefined as object | undefined,
	isLoadingCall: false,
	appCommission: 3_000n as bigint | null,
}));

vi.mock("./SwapProvider", async () => {
	const { KNOWN_TOKENS_MAP } = await import("../../registry/tokens/tokens");
	return {
		useSwap: () => ({
			tokenIn: KNOWN_TOKENS_MAP["native::pah"],
			tokenOut: KNOWN_TOKENS_MAP["asset::pah::1337"],
			transaction: { call: swap.call },
			isLoadingCall: swap.isLoadingCall,
			details: {
				kind: "amm-swap",
				route: null,
				liquidity: null,
				quote: undefined,
				priceImpact: -0.001,
				minPlancksOut: 990_000n,
				slippage: 0.005,
				appCommission: swap.appCommission,
			},
		}),
	};
});

vi.mock("../../components/Shimmer", () => ({
	Shimmer: () => <span aria-hidden="true" />,
}));
vi.mock("./RateValue", () => ({ RateValue: () => "1 DOT = 1 USDC" }));
vi.mock("./Slippage", () => ({ Slippage: () => "0.5%" }));
vi.mock("../transaction/TransactionDryRunValue", () => ({
	TransactionDryRunSummaryValue: () => "Success",
}));
vi.mock("../transaction/TransactionFeeSummaryValue", () => ({
	TransactionFeeSummaryValue: () => "0.0014 DOT",
}));

afterEach(cleanup);

describe("SwapSummary on a pool swap", () => {
	it("keeps the slippage, simulation and fee rows while the call for a new amount is built", () => {
		swap.call = undefined;
		swap.isLoadingCall = true;
		render(<SwapSummary />);

		expect(screen.getByText("Slippage tolerance")).toBeTruthy();
		expect(screen.getByText("Simulation")).toBeTruthy();
		expect(screen.getByText("Transaction fee")).toBeTruthy();
		expect(screen.queryByText("Success")).toBeNull();
	});

	it("leaves the rows out when no call is coming", () => {
		swap.call = undefined;
		swap.isLoadingCall = false;
		render(<SwapSummary />);

		expect(screen.queryByText("Slippage tolerance")).toBeNull();
	});
});
