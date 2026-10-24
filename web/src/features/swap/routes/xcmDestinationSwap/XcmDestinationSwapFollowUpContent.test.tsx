import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { TransactionRecord } from "../../../../state/transactions/types";
import type {
	XcmArrival,
	XcmTransferFollowUpData,
} from "../../../../state/transactions/xcmArrival";
import { XcmDestinationSwapFollowUpContent } from "./XcmDestinationSwapFollowUpContent";
import { usdtToPink } from "./xcmDestinationSwap.fixtures";

const arrival = vi.hoisted(() => ({ current: null as XcmArrival | null }));

vi.mock("../../../../state/transactions/xcmArrival", async (importActual) => ({
	...(await importActual()),
	useXcmArrival: () => arrival.current,
}));

afterEach(cleanup);

const tokenOut = KNOWN_TOKENS_MAP[usdtToPink.tokenIdOut];
if (!tokenOut) throw new Error(`unknown token ${usdtToPink.tokenIdOut}`);

const followUpData: XcmTransferFollowUpData = {
	origin: "hydration",
	target: { tokenId: usdtToPink.tokenIdOut, beneficiary: usdtToPink.sender },
	tokenOut,
	estimatedReceived: 497686228859862n,
};

const record = {
	id: "xcm-destination-swap",
	type: "xcmDestinationSwap",
	status: "finalized",
	txEvents: [],
	followUpData,
} as unknown as TransactionRecord;

describe("XcmDestinationSwapFollowUpContent", () => {
	it("says the funds stay in the account when the swap fails on Asset Hub", () => {
		arrival.current = { status: "failed-on-destination", messageId: "0x01" };
		render(<XcmDestinationSwapFollowUpContent transaction={record} />);

		expect(screen.getByText("Arrival on Polkadot Asset Hub")).toBeVisible();
		expect(
			screen.getByText("Swap failed, funds kept in your account"),
		).toBeVisible();
		expect(screen.queryByText("Failed, assets trapped")).toBeNull();
	});

	it("shows the swapped output once it arrives", () => {
		arrival.current = {
			status: "arrived",
			messageId: "0x01",
			received: 497686228859862n,
		};
		render(<XcmDestinationSwapFollowUpContent transaction={record} />);

		expect(screen.getByText("Arrived")).toBeVisible();
		expect(screen.getByText("Received")).toBeVisible();
	});
});
