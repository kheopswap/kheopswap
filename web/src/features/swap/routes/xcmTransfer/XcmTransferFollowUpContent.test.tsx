import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChainId } from "../../../../registry/chains/types";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { TransactionRecord } from "../../../../state/transactions/types";
import type { XcmTransferFollowUpData } from "../../../../state/transactions/xcmArrival";
import { XcmTransferFollowUpContent } from "./XcmTransferFollowUpContent";

vi.mock("../../../../state/transactions/xcmArrival", async (importActual) => ({
	...(await importActual()),
	useXcmArrival: () => ({ status: "in-transit", messageId: "0x00" }),
}));

vi.mock("../../../../components/Pulse", () => ({
	Pulse: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));

afterEach(cleanup);

const BENEFICIARY = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";

const renderInTransit = (origin: ChainId, firstHop: ChainId) => {
	const tokenId = `native::${firstHop}`;
	const followUpData: XcmTransferFollowUpData = {
		origin,
		firstHop,
		target: { tokenId, beneficiary: BENEFICIARY },
		returnTokenIds: [tokenId],
		tokenOut: KNOWN_TOKENS_MAP[tokenId] as XcmTransferFollowUpData["tokenOut"],
		estimatedReceived: undefined,
	};
	render(
		<XcmTransferFollowUpContent
			transaction={
				{
					id: "xcm-transfer",
					type: "xcmTransfer",
					status: "finalized",
					txEvents: [],
					followUpData,
				} as unknown as TransactionRecord
			}
		/>,
	);
};

describe("XcmTransferFollowUpContent in transit", () => {
	it("tells that a bridge transfer takes a few minutes", () => {
		renderInTransit("pah", "kah");

		expect(screen.getByText("Arrival on Kusama Asset Hub")).toBeVisible();
		expect(
			screen.getByText("Crossing the bridge, takes a few minutes"),
		).toBeVisible();
	});

	it("reads in transit on one relay", () => {
		renderInTransit("pah", "ppeople");

		expect(screen.getByText("In transit")).toBeVisible();
	});
});
