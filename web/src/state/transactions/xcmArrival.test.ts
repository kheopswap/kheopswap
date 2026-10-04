import { BehaviorSubject, Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { XcmDepositTarget } from "../../utils/xcmDeposit";
import type { TransactionRecord } from "./types";
import {
	findArrival,
	getSentMessageId,
	getXcmArrival$,
	isXcmArrivalType,
	type XcmArrival,
} from "./xcmArrival";

const HYDRATION_PARA_ID = getChainById("hydration").paraId;
const MESSAGE_ID =
	"0x6c79370c66515d9e929b9cca10beb95e43247e2469d15c1586b8506d273b631b";
const OTHER_MESSAGE_ID =
	"0x94b622398df1f3b031c6e4f380c4a332b5d74e5e43a43f3ce0b259bfc1e8ef90";
const BENEFICIARY = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";
const FEE_RECEIVER = "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB";

const target: XcmDepositTarget = {
	tokenId: "hydration-asset::hydration::5",
	beneficiary: BENEFICIARY,
};

const deposited = (who: string, amount: bigint, currency_id = 5) => ({
	type: "Tokens",
	value: { type: "Deposited", value: { currency_id, who, amount } },
});

const processed = (id: string, success = true) => ({
	type: "MessageQueue",
	value: {
		type: "Processed",
		value: { id, origin: { type: "Sibling", value: 1000 }, success },
	},
});

const sentTo = (paraId: number, message_id = MESSAGE_ID) => ({
	type: "PolkadotXcm",
	value: {
		type: "Sent",
		value: {
			destination: {
				parents: 1,
				interior: { type: "X1", value: { type: "Parachain", value: paraId } },
			},
			message_id,
		},
	},
});

const ourArrival: TxEvents = [
	deposited(BENEFICIARY, 9995190152n),
	deposited(FEE_RECEIVER, 4809848n),
	processed(MESSAGE_ID),
];

const getRecord = (
	status: TransactionRecord["status"],
	events: TxEvents = [],
): TransactionRecord =>
	({
		id: "tx",
		type: "xcmTransfer",
		status,
		txEvents: events.length
			? [{ type: "inBestBlock", ok: true, events }]
			: [{ type: "pending" }],
	}) as unknown as TransactionRecord;

describe("isXcmArrivalType", () => {
	it.each([
		["xcmTransfer", true],
		["xcmSwap", true],
		["swap", false],
		["transfer", false],
	] as const)("tracks the arrival of %s: %s", (type, expected) => {
		expect(isXcmArrivalType(type)).toBe(expected);
	});
});

describe("findArrival", () => {
	it("returns the amount deposited to the beneficiary by our message, ignoring the fee receiver", () => {
		expect(findArrival(ourArrival, { messageId: MESSAGE_ID, target })).toEqual({
			success: true,
			received: 9995190152n,
		});
	});

	it("ignores deposits made by other messages processed earlier in the block", () => {
		expect(
			findArrival(
				[
					deposited(BENEFICIARY, 123n),
					processed(OTHER_MESSAGE_ID),
					...ourArrival,
				],
				{ messageId: MESSAGE_ID, target },
			),
		).toEqual({ success: true, received: 9995190152n });
	});

	it("ignores deposits of other assets", () => {
		expect(
			findArrival([deposited(BENEFICIARY, 7n, 10), ...ourArrival], {
				messageId: MESSAGE_ID,
				target,
			}),
		).toEqual({ success: true, received: 9995190152n });
	});

	it("matches the message id regardless of hex case", () => {
		expect(
			findArrival(ourArrival, {
				messageId: MESSAGE_ID.toUpperCase().replace("0X", "0x"),
				target,
			}),
		).toEqual({ success: true, received: 9995190152n });
	});

	it("reports a failed execution without a received amount", () => {
		expect(
			findArrival(
				[deposited(FEE_RECEIVER, 3847879n), processed(MESSAGE_ID, false)],
				{ messageId: MESSAGE_ID, target },
			),
		).toEqual({ success: false, received: null });
	});

	it("reports a message that failed to process", () => {
		expect(
			findArrival(
				[
					{
						type: "MessageQueue",
						value: {
							type: "ProcessingFailed",
							value: { id: MESSAGE_ID, error: { type: "Corrupt" } },
						},
					},
				],
				{ messageId: MESSAGE_ID, target },
			),
		).toEqual({ success: false, received: null });
	});

	it("returns null for a block that did not process our message", () => {
		expect(
			findArrival([deposited(BENEFICIARY, 123n), processed(OTHER_MESSAGE_ID)], {
				messageId: MESSAGE_ID,
				target,
			}),
		).toBeNull();
	});
});

describe("getSentMessageId", () => {
	it("reads the id of the message sent to Hydration", () => {
		expect(
			getSentMessageId(
				getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]).txEvents,
				HYDRATION_PARA_ID,
			),
		).toBe(MESSAGE_ID);
	});

	it("ignores messages sent to other chains", () => {
		expect(
			getSentMessageId(
				getRecord("inBlock", [sentTo(1002)]).txEvents,
				HYDRATION_PARA_ID,
			),
		).toBeNull();
	});

	it("returns null before the transaction is included", () => {
		expect(
			getSentMessageId(getRecord("broadcasted").txEvents, HYDRATION_PARA_ID),
		).toBeNull();
	});
});

describe("getXcmArrival$", () => {
	const track = (
		initial: TransactionRecord | undefined,
		timeoutMs?: number,
	) => {
		const record$ = new BehaviorSubject<TransactionRecord | undefined>(initial);
		const blockEvents$ = new Subject<TxEvents>();
		const arrivals: XcmArrival[] = [];
		let isComplete = false;
		getXcmArrival$({
			record$,
			blockEvents$,
			target,
			destinationParaId: HYDRATION_PARA_ID,
			timeoutMs,
		}).subscribe({
			next: (arrival) => arrivals.push(arrival),
			complete: () => {
				isComplete = true;
			},
		});
		return { record$, blockEvents$, arrivals, isComplete: () => isComplete };
	};

	afterEach(() => {
		vi.useRealTimers();
	});

	it("follows the transfer from the wallet prompt to its arrival on Hydration", () => {
		const { record$, blockEvents$, arrivals, isComplete } = track(
			getRecord("pending"),
		);
		blockEvents$.next([processed(OTHER_MESSAGE_ID)]);
		record$.next(getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]));
		blockEvents$.next([]);
		blockEvents$.next(ourArrival);

		expect(arrivals).toEqual([
			{ status: "awaiting-origin" },
			{ status: "in-transit", messageId: MESSAGE_ID },
			{ status: "arrived", messageId: MESSAGE_ID, received: 9995190152n },
		]);
		expect(isComplete()).toBe(true);
	});

	it("catches an arrival processed before the origin events reveal the message id", () => {
		const { record$, blockEvents$, arrivals } = track(getRecord("pending"));
		blockEvents$.next(ourArrival);
		blockEvents$.next([]);
		record$.next(getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]));

		expect(arrivals.at(-1)).toEqual({
			status: "arrived",
			messageId: MESSAGE_ID,
			received: 9995190152n,
		});
	});

	it("keeps tracking after the transaction record is dismissed", () => {
		const { record$, blockEvents$, arrivals } = track(
			getRecord("finalized", [sentTo(HYDRATION_PARA_ID)]),
		);
		record$.next(undefined);
		blockEvents$.next(ourArrival);

		expect(arrivals.at(-1)?.status).toBe("arrived");
	});

	it("reports a failure on Hydration", () => {
		const { blockEvents$, arrivals, isComplete } = track(
			getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]),
		);
		blockEvents$.next([processed(MESSAGE_ID, false)]);

		expect(arrivals.at(-1)).toEqual({
			status: "failed-on-destination",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(true);
	});

	it("stops when the origin transaction fails", () => {
		const { record$, arrivals, isComplete } = track(getRecord("pending"));
		record$.next(getRecord("failed"));

		expect(arrivals).toEqual([
			{ status: "awaiting-origin" },
			{ status: "origin-failed" },
		]);
		expect(isComplete()).toBe(true);
	});

	it("gives up as unconfirmed when nothing arrives before the timeout", () => {
		vi.useFakeTimers();
		const { arrivals, isComplete } = track(
			getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]),
			60_000,
		);
		vi.advanceTimersByTime(59_999);
		expect(arrivals.at(-1)?.status).toBe("in-transit");
		vi.advanceTimersByTime(1);

		expect(arrivals.at(-1)).toEqual({
			status: "unconfirmed",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(true);
	});
});
