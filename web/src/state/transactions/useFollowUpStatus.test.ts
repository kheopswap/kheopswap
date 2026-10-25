import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { FollowUpTxEvent, TransactionRecord } from "./types";
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

const feePaid = (actual_fee: bigint): TxEvents[number] => ({
	type: "TransactionPayment",
	value: { type: "TransactionFeePaid", value: { actual_fee, tip: 0n } },
});

const extrinsicFailed: TxEvents[number] = {
	type: "System",
	value: {
		type: "ExtrinsicFailed",
		value: { dispatch_error: { type: "Token", value: { type: "Frozen" } } },
	},
};

const failedInclusion = {
	type: "inBestBlock",
	ok: false,
	txHash: "0x01",
	events: [feePaid(11n), extrinsicFailed],
} as unknown as FollowUpTxEvent;
const retracted = { type: "notInBestBlock", txHash: "0x01" } as FollowUpTxEvent;
const canonicalEvents = [feePaid(22n)];
const okInclusion = {
	type: "inBestBlock",
	ok: true,
	txHash: "0x01",
	events: canonicalEvents,
} as unknown as FollowUpTxEvent;
const finalizedOk = {
	type: "finalized",
	ok: true,
	txHash: "0x01",
	events: canonicalEvents,
} as unknown as FollowUpTxEvent;

const transferWith = (txEvents: FollowUpTxEvent[]): TransactionRecord =>
	({
		id: "transfer",
		createdAt: 0,
		type: "transfer",
		title: "Transfer DOT",
		status: "pending",
		txEvents: [
			{ type: "pending" },
			{ type: "broadcasted", txHash: "0x01" },
			...txEvents,
		],
		account: { platform: "polkadot", walletName: "Test" },
		feeEstimate: 0n,
		feeToken: KNOWN_TOKENS_MAP["native::pah"],
	}) as unknown as TransactionRecord;

const renderTransfer = (txEvents: FollowUpTxEvent[]) =>
	renderHook(() => useFollowUpStatus(transferWith(txEvents), null)).result
		.current;

describe("useFollowUpStatus after a retracted inclusion", () => {
	it("reports the failed best-block inclusion while it stands", () => {
		expect(renderTransfer([failedInclusion])).toMatchObject({
			message: "Waiting for finalization",
			result: "error",
			errorMessage: "Token: Frozen",
			effectiveFee: null,
		});
	});

	it("drops the error and the fee once the chain retracts the block", () => {
		expect(renderTransfer([failedInclusion, retracted])).toMatchObject({
			message: "Transaction submitted...",
			result: "loading",
			errorMessage: null,
			effectiveFee: null,
		});
	});

	it("reads the successful reinclusion, not the retracted failure", () => {
		expect(
			renderTransfer([failedInclusion, retracted, okInclusion]),
		).toMatchObject({
			message: "Waiting for finalization",
			result: "success",
			errorMessage: null,
			effectiveFee: 22n,
		});
	});

	it("reports the finalized outcome with its own fee", () => {
		expect(
			renderTransfer([failedInclusion, retracted, okInclusion, finalizedOk]),
		).toMatchObject({
			message: "Transaction succeeded",
			result: "success",
			isFinal: true,
			errorMessage: null,
			effectiveFee: 22n,
		});
	});
});

describe("useFollowUpStatus on a verdict reached without seeing the inclusion", () => {
	const renderSettled = (status: "lostTrack" | "expired" | "unknown") =>
		renderHook(() =>
			useFollowUpStatus({ ...transferWith([{ type: status }]), status }, null),
		).result.current;

	it("tells the user the chain executed a transaction the app lost track of", () => {
		expect(renderSettled("lostTrack")).toMatchObject({
			message: "Included, but the app lost track of it",
			result: "warning",
			isFinal: true,
			errorMessage:
				"The chain accepted a transaction from this account. Check the block explorer for its result.",
			blockExplorerUrl: expect.stringContaining("0x01"),
		});
	});

	it("tells the user an expired transaction spent nothing", () => {
		expect(renderSettled("expired")).toMatchObject({
			message: "Transaction expired",
			result: "error",
			isFinal: true,
			errorMessage:
				"Not included before it expired. Nothing was spent, you can retry.",
		});
	});

	it.each([
		["lostTrack", "Included, but the app lost track of it"],
		["unknown", "Could not confirm this transaction"],
	] as const)(
		"reports a %s verdict reached after a best-block inclusion",
		(status, message) => {
			expect(
				renderHook(() =>
					useFollowUpStatus(
						{ ...transferWith([okInclusion, { type: status }]), status },
						null,
					),
				).result.current,
			).toMatchObject({ message, result: "warning", isFinal: true });
		},
	);

	it("sends the user to the explorer when the chain could not be read", () => {
		expect(renderSettled("unknown")).toMatchObject({
			message: "Could not confirm this transaction",
			result: "warning",
			isFinal: true,
			errorMessage:
				"The app could not confirm this transaction. Check the block explorer before retrying.",
		});
	});
});
