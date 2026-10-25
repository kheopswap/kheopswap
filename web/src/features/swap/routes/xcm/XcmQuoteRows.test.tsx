import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { TokenId } from "../../../../registry/tokens/types";
import type { XcmRoute } from "../swapRoute";
import type { XcmQuoteState } from "./useXcmQuote";
import { XcmQuoteRows } from "./XcmQuoteRows";
import type { XcmFee } from "./xcmQuote";

const DOT_ID = "native::pah" as TokenId;

const state = vi.hoisted(() => ({
	totalIn: undefined as bigint | undefined,
	call: undefined as object | undefined,
	isLoadingCall: false,
	feeEstimate: undefined as bigint | undefined,
	isCallFeeEstimated: false,
}));

vi.mock("../../SwapProvider", () => ({
	useSwap: () => ({
		tokenOut: KNOWN_TOKENS_MAP["native::pah"],
		totalIn: state.totalIn,
		isLoadingCall: state.isLoadingCall,
		transaction: {
			call: state.call,
			callSpendings: state.totalIn
				? { "native::pah": { plancks: state.totalIn, allowDeath: false } }
				: {},
		},
	}),
}));

vi.mock("../../../transaction/TransactionProvider", () => ({
	useTransaction: () => ({
		feeToken: KNOWN_TOKENS_MAP["native::pah"],
		feeEstimate: state.feeEstimate,
		isCallFeeEstimated: state.isCallFeeEstimated,
	}),
}));

vi.mock("../../../../components/Shimmer", () => ({
	Shimmer: () => <span data-testid="shimmer" />,
}));

const ROUTE = {
	kind: "xcm-transfer",
	origin: "hydration",
	destination: "pah",
	tokenIdIn: "hydration-asset::hydration::5",
	tokenIdOut: DOT_ID,
} as XcmRoute;

const quoted = (plancks: bigint): XcmFee => ({
	tokenId: DOT_ID,
	plancks,
	isEstimate: false,
});

const settledQuote = (
	deliveryFee: XcmQuoteState["deliveryFee"],
): XcmQuoteState => ({
	isLoading: false,
	data: undefined,
	deliveryFee,
	sent: undefined,
});

const rowValue = (label: string) =>
	screen.getByText(label).closest(".flex.w-full")?.lastElementChild;

const renderRows = (quote: XcmQuoteState, destinationFee?: XcmFee) =>
	render(
		<XcmQuoteRows
			quote={quote}
			received={undefined}
			destinationFee={destinationFee}
			route={ROUTE}
		/>,
	);

afterEach(cleanup);

describe("XcmQuoteRows total debited", () => {
	beforeEach(() => {
		state.totalIn = 1_000_000_000n;
		state.call = {};
		state.isLoadingCall = false;
		state.feeEstimate = 20_000_000n;
		state.isCallFeeEstimated = true;
	});

	it("is empty before an amount is entered", () => {
		state.totalIn = undefined;
		state.call = undefined;
		renderRows(settledQuote(quoted(0n)));

		expect(rowValue("Total debited")?.textContent).toBe("");
	});

	it("adds what the call spends and its transaction fee", () => {
		renderRows(settledQuote(quoted(305_000_000n)));

		expect(rowValue("Total debited")?.textContent).toBe("0.102 DOT");
	});

	it("shimmers while the call for a new amount is built, whatever fee is known", () => {
		state.call = undefined;
		state.isLoadingCall = true;
		renderRows(settledQuote(quoted(305_000_000n)));

		expect(rowValue("Total debited")?.textContent).toBe("");
		expect(
			rowValue("Total debited")?.querySelector("[data-testid=shimmer]"),
		).toBeTruthy();
	});

	it("shimmers while only the fake call's delivery fee is known", () => {
		renderRows({
			...settledQuote({ ...quoted(305_000_000n), isEstimate: true }),
			isLoading: true,
		});

		expect(rowValue("Total debited")?.textContent).toBe("");
		expect(
			rowValue("Total debited")?.querySelector("[data-testid=shimmer]"),
		).toBeTruthy();
	});

	it("shimmers while only the fake call's fee is known", () => {
		state.isCallFeeEstimated = false;
		renderRows(settledQuote(quoted(305_000_000n)));

		expect(
			rowValue("Total debited")?.querySelector("[data-testid=shimmer]"),
		).toBeTruthy();
	});
});

describe("XcmQuoteRows fees", () => {
	it("shows the last quote's destination fee as an estimate", () => {
		renderRows(settledQuote(quoted(0n)), {
			tokenId: DOT_ID,
			plancks: 17_000_000n,
			isEstimate: true,
		});

		const value = rowValue("Polkadot Asset Hub fee");
		expect(value?.textContent).toBe("0.0017 DOT (est.)");
		expect(value?.firstElementChild?.className).toContain("text-muted");
	});

	it("marks the fake call's delivery fee as an estimate", () => {
		renderRows(settledQuote({ ...quoted(305_000_000n), isEstimate: true }));

		const value = rowValue("Delivery fee");
		expect(value?.textContent).toBe("0.0305 DOT (est.)");
		expect(value?.firstElementChild?.className).toContain("text-muted");
	});

	it("leaves out the delivery fee row once its estimate has failed", () => {
		renderRows(settledQuote(undefined));

		expect(screen.queryByText("Delivery fee")).toBeNull();
	});
});
