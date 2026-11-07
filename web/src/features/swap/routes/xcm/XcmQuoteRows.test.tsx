import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { TokenId } from "../../../../registry/tokens/types";
import type { XcmRoute } from "../swapRoute";
import type { XcmQuoteState } from "./useXcmQuote";
import { XcmQuoteRows } from "./XcmQuoteRows";

const DOT_ID = "native::pah" as TokenId;
const HYDRATION_DOT_ID = "hydration-asset::hydration::5" as TokenId;

vi.mock("../../SwapProvider", () => ({
	useSwap: () => ({
		tokenOut: KNOWN_TOKENS_MAP["hydration-asset::hydration::5"],
	}),
}));

vi.mock("../../../../components/Shimmer", () => ({
	Shimmer: () => <span data-testid="shimmer" />,
}));

const ROUTE: XcmRoute = {
	kind: "xcm-transfer",
	origin: "pah",
	destination: "hydration",
	tokenIdIn: DOT_ID,
	tokenIdOut: HYDRATION_DOT_ID,
};

const settledQuote = (deliveryPlancks: bigint): XcmQuoteState => ({
	isLoading: false,
	deliveryFee: { tokenId: DOT_ID, plancks: deliveryPlancks },
	data: {
		success: true,
		quote: {
			received: 994_000_000n,
			destinationFee: { tokenId: HYDRATION_DOT_ID, plancks: 6_000_000n },
		},
	},
});

const rowValue = (label: string) =>
	screen.getByText(label).closest(".flex.w-full")?.lastElementChild;

afterEach(cleanup);

describe("XcmQuoteRows fees", () => {
	it("shows the delivery fee and the destination fee in separate rows", () => {
		render(<XcmQuoteRows quote={settledQuote(305_000_000n)} route={ROUTE} />);

		expect(rowValue("Delivery fee")?.textContent).toBe("0.0305 DOT");
		expect(rowValue("Destination fee")?.textContent).toBe("0.0006 DOT");
		expect(screen.queryByText(/XCM fee/)).toBeNull();
	});

	it("keeps the delivery fee row when the fee is zero", () => {
		render(<XcmQuoteRows quote={settledQuote(0n)} route={ROUTE} />);

		expect(rowValue("Delivery fee")?.textContent).toBe("0 DOT");
	});

	it("shimmers the destination fee while the quote loads", () => {
		render(
			<XcmQuoteRows
				quote={{ isLoading: true, data: undefined, deliveryFee: undefined }}
				route={ROUTE}
			/>,
		);

		expect(
			rowValue("Destination fee")?.querySelector("[data-testid=shimmer]"),
		).toBeTruthy();
	});
});
