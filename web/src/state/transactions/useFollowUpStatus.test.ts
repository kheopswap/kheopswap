import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import type { TransactionRecord } from "./types";
import { useFollowUpStatus } from "./useFollowUpStatus";
import type { XcmArrival } from "./xcmArrival";

const MESSAGE_ID = "0x01";
const DOT_ON_HYDRATION = "hydration-asset::hydration::5";

const inBlockTransfer = {
	id: "xcm-transfer",
	createdAt: 0,
	type: "xcmTransfer",
	title: "Transfer DOT to Hydration",
	status: "inBlock",
	txHash: "0x01",
	txEvents: [{ type: "inBestBlock", ok: true, txHash: "0x01", events: [] }],
	account: { platform: "polkadot", walletName: "Test" },
	feeEstimate: 0n,
	feeToken: KNOWN_TOKENS_MAP["native::pah"],
	followUpData: {
		origin: "pah",
		target: { tokenId: DOT_ON_HYDRATION, beneficiary: "5Beneficiary" },
		returnTokenIds: [DOT_ON_HYDRATION],
		tokenOut: KNOWN_TOKENS_MAP[DOT_ON_HYDRATION],
		estimatedReceived: 1n,
	},
} as unknown as TransactionRecord;

const provisionalFailure: XcmArrival = {
	status: "failed-on-destination",
	messageId: MESSAGE_ID,
	returned: [],
	trapped: true,
	finalized: false,
};

const renderStatus = (arrival: XcmArrival | null) =>
	renderHook(() => useFollowUpStatus(inBlockTransfer, arrival)).result.current;

describe("useFollowUpStatus headline while the origin waits for finality", () => {
	it("reports a provisional destination failure as an open error", () => {
		expect(renderStatus(provisionalFailure)).toMatchObject({
			message: "Failed on Hydration, assets trapped",
			result: "error",
			isFinal: false,
		});
	});

	it("reports a provisional arrival without calling it final", () => {
		expect(
			renderStatus({
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 1n,
				finalized: true,
			}),
		).toMatchObject({
			message: "Arrived on Hydration, awaiting finalization",
			result: "success",
			isFinal: false,
		});
	});

	it("keeps the origin headline while the message is in transit", () => {
		expect(
			renderStatus({ status: "in-transit", messageId: MESSAGE_ID }),
		).toMatchObject({
			message: "Waiting for finalization",
			result: "success",
			isFinal: false,
		});
	});
});
