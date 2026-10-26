import { BehaviorSubject, Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dotFromPeople } from "../../features/swap/routes/xcm/xcmFromPeople.fixtures";
import { getChainById } from "../../registry/chains/chains";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { XcmDepositTarget } from "../../utils/xcmDeposit";
import type { TransactionRecord } from "./types";
import {
	findArrival,
	getArrivalBufferBlocks,
	getSentMessageId,
	getXcmArrival$,
	getXcmBlockEvents,
	isAwaitingXcmArrival,
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
		bufferBlocks = getArrivalBufferBlocks("hydration"),
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
			bufferBlocks,
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

	it("catches an arrival processed many fast Asset Hub blocks before the message id is known", () => {
		const { record$, blockEvents$, arrivals } = track(
			getRecord("pending"),
			undefined,
			getArrivalBufferBlocks("pah"),
		);
		blockEvents$.next(ourArrival);
		for (let block = 0; block < 20; block++) blockEvents$.next([]);
		record$.next(getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]));

		expect(arrivals.at(-1)?.status).toBe("arrived");
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

describe("arrival on Asset Hub", () => {
	const ASSET_HUB_BENEFICIARY =
		"147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w";
	const ASSET_HUB_FEE_RECEIVER =
		"13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2";
	const assetHubTarget: XcmDepositTarget = {
		tokenId: "native::pah",
		beneficiary: ASSET_HUB_BENEFICIARY,
	};
	const balanceDeposit = (who: string, amount: bigint) => ({
		type: "Balances",
		value: { type: "Deposit", value: { who, amount } },
	});
	const inPhase = (type: string, event: TxEvents[number]) => ({
		phase: { type },
		event,
	});

	it("counts only the deposit of our message, not the beneficiary's own transaction earlier in the block", () => {
		const blockEvents = getXcmBlockEvents([
			inPhase("ApplyExtrinsic", balanceDeposit(ASSET_HUB_BENEFICIARY, 5n)),
			inPhase(
				"Finalization",
				balanceDeposit(ASSET_HUB_BENEFICIARY, 9991650007n),
			),
			inPhase("Finalization", balanceDeposit(ASSET_HUB_FEE_RECEIVER, 8349993n)),
			inPhase("Finalization", processed(MESSAGE_ID)),
		]);

		expect(
			findArrival(blockEvents, {
				messageId: MESSAGE_ID,
				target: assetHubTarget,
			}),
		).toEqual({ success: true, received: 9991650007n });
	});

	it("keeps about a minute of blocks on each destination", () => {
		expect(getArrivalBufferBlocks("hydration")).toBe(10);
		expect(getArrivalBufferBlocks("pah")).toBe(30);
	});
});

describe("arrival on People", () => {
	const PEOPLE_PARA_ID = getChainById("paspeople").paraId;
	const PEOPLE_MESSAGE_ID =
		"0xaf19eb7ec0977875d46022870a6a30b75627f426c48647787367b05e405b1f82";
	const peopleTarget: XcmDepositTarget = {
		tokenId: "native::paspeople",
		beneficiary: BENEFICIARY,
	};
	const inPhase = (type: string, event: TxEvents[number]) => ({
		phase: { type },
		event,
	});
	const extrinsicSuccess = {
		type: "System",
		value: { type: "ExtrinsicSuccess", value: {} },
	};

	it("follows a teleport whose message People processes at the end of a block", () => {
		const sent = getRecord("finalized", [
			sentTo(PEOPLE_PARA_ID, PEOPLE_MESSAGE_ID),
		]);
		expect(getSentMessageId(sent.txEvents, PEOPLE_PARA_ID)).toBe(
			PEOPLE_MESSAGE_ID,
		);

		const blockEvents = getXcmBlockEvents([
			inPhase("ApplyExtrinsic", extrinsicSuccess),
			inPhase("ApplyExtrinsic", extrinsicSuccess),
			inPhase("Finalization", {
				type: "Balances",
				value: { type: "Issued", value: { amount: 10000000000n } },
			}),
			inPhase("Finalization", {
				type: "Balances",
				value: {
					type: "Deposit",
					value: { who: BENEFICIARY, amount: 10000000000n },
				},
			}),
			inPhase("Finalization", {
				type: "MessageQueue",
				value: {
					type: "Processed",
					value: {
						id: PEOPLE_MESSAGE_ID,
						origin: { type: "Sibling", value: 1000 },
						weight_used: { ref_time: 181708000n, proof_size: 3593n },
						success: true,
					},
				},
			}),
		]);
		expect(
			findArrival(blockEvents, {
				messageId: PEOPLE_MESSAGE_ID,
				target: peopleTarget,
			}),
		).toEqual({ success: true, received: 10000000000n });
	});

	it("keeps 30 blocks of People events", () => {
		expect(getArrivalBufferBlocks("paspeople")).toBe(30);
	});
});

describe("arrival on Asset Hub from People", () => {
	const PEOPLE_MESSAGE_ID =
		"0xacee353b26e8d36266e3a0cae2562e9cf8535e467be1a116877514aefa519362";
	const PEOPLE_BENEFICIARY = "16Jh21ThTh2tW98NuN2gM7Q3KaYiuJLbxCNbuBkFpwcDkRqx";
	const ASSET_HUB_BLOCK_22023474 = [
		{
			phase: { type: "ApplyExtrinsic", value: 0 },
			event: {
				type: "System",
				value: {
					type: "ExtrinsicSuccess",
					value: {
						dispatch_info: {
							weight: { ref_time: 125000000n, proof_size: 0n },
							class: { type: "Mandatory" },
							pays_fee: { type: "Yes" },
						},
					},
				},
			},
		},
		{
			phase: { type: "ApplyExtrinsic", value: 1 },
			event: {
				type: "System",
				value: {
					type: "ExtrinsicSuccess",
					value: {
						dispatch_info: {
							weight: { ref_time: 192900000n, proof_size: 1493n },
							class: { type: "Mandatory" },
							pays_fee: { type: "Yes" },
						},
					},
				},
			},
		},
		{
			phase: { type: "ApplyExtrinsic", value: 2 },
			event: {
				type: "Balances",
				value: {
					type: "Withdraw",
					value: {
						who: "148GnWxDeGsoF6yZMEWyk1LDkx25gGDVWfrLEE7wyzsxVJ4U",
						amount: 9070082n,
					},
				},
			},
		},
		{
			phase: { type: "ApplyExtrinsic", value: 2 },
			event: {
				type: "Balances",
				value: {
					type: "Transfer",
					value: {
						from: "148GnWxDeGsoF6yZMEWyk1LDkx25gGDVWfrLEE7wyzsxVJ4U",
						to: "14n8ferDrb3uorc5esxHgt2gePPFDTSn4qvxBywVEosejVFL",
						amount: 471862587901000n,
					},
				},
			},
		},
		{
			phase: { type: "ApplyExtrinsic", value: 2 },
			event: {
				type: "Balances",
				value: {
					type: "Deposit",
					value: {
						who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
						amount: 9070082n,
					},
				},
			},
		},
		{
			phase: { type: "ApplyExtrinsic", value: 2 },
			event: {
				type: "TransactionPayment",
				value: {
					type: "TransactionFeePaid",
					value: {
						who: "148GnWxDeGsoF6yZMEWyk1LDkx25gGDVWfrLEE7wyzsxVJ4U",
						actual_fee: 9070082n,
						tip: 0n,
					},
				},
			},
		},
		{
			phase: { type: "ApplyExtrinsic", value: 2 },
			event: {
				type: "System",
				value: {
					type: "ExtrinsicSuccess",
					value: {
						dispatch_info: {
							weight: { ref_time: 588343000n, proof_size: 7717n },
							class: { type: "Normal" },
							pays_fee: { type: "Yes" },
						},
					},
				},
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "Balances",
				value: {
					type: "Transfer",
					value: {
						from: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
						to: "13UVJyLkAxdQn6zM3GrLGvrFgN9jWneRX2NGvf3u92iunZq1",
						amount: 9070082n,
					},
				},
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "Dap",
				value: { type: "StagingDrained", value: { amount: 9070082n } },
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "Balances",
				value: {
					type: "Burned",
					value: {
						who: "13UVJyLnbVp9x5XDyJv8g8r3UddNwBrdaH7AADCmw9XQWvYW",
						amount: 7800000000n,
					},
				},
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "Balances",
				value: { type: "Issued", value: { amount: 7800000000n } },
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "Balances",
				value: {
					type: "Deposit",
					value: {
						who: "16Jh21ThTh2tW98NuN2gM7Q3KaYiuJLbxCNbuBkFpwcDkRqx",
						amount: 7791782414n,
					},
				},
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "Balances",
				value: {
					type: "Deposit",
					value: {
						who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
						amount: 8217586n,
					},
				},
			},
		},
		{
			phase: { type: "Finalization", value: undefined },
			event: {
				type: "MessageQueue",
				value: {
					type: "Processed",
					value: {
						id: "0xacee353b26e8d36266e3a0cae2562e9cf8535e467be1a116877514aefa519362",
						origin: { type: "Sibling", value: 1004 },
						weight_used: { ref_time: 368588000n, proof_size: 10861n },
						success: true,
					},
				},
			},
		},
	];

	it("reads the message id People reports when it sends a teleport to Asset Hub", () => {
		if (!dotFromPeople.originDryRun.success)
			throw new Error("fixture origin failed");
		const record = getRecord(
			"finalized",
			dotFromPeople.originDryRun.value.emitted_events,
		);
		expect(getSentMessageId(record.txEvents, getChainById("pah").paraId)).toBe(
			"0x683cf77a60b984103a1a86f1dbb9e61e86e4d88453c30d67e7cdda47eb555b85",
		);
	});

	it("finds the DOT a People teleport deposited in Polkadot Asset Hub block 22023474", () => {
		const sent = getRecord("finalized", [
			sentTo(getChainById("pah").paraId, PEOPLE_MESSAGE_ID),
		]);
		expect(getSentMessageId(sent.txEvents, getChainById("pah").paraId)).toBe(
			PEOPLE_MESSAGE_ID,
		);
		expect(
			findArrival(getXcmBlockEvents(ASSET_HUB_BLOCK_22023474), {
				messageId: PEOPLE_MESSAGE_ID,
				target: { tokenId: "native::pah", beneficiary: PEOPLE_BENEFICIARY },
			}),
		).toEqual({ success: true, received: 7791782414n });
	});
});

describe("isAwaitingXcmArrival", () => {
	const finalized = getRecord("finalized", [sentTo(HYDRATION_PARA_ID)]);

	it.each<[XcmArrival | null, boolean]>([
		[null, true],
		[{ status: "awaiting-origin" }, true],
		[{ status: "in-transit", messageId: MESSAGE_ID }, true],
		[{ status: "arrived", messageId: MESSAGE_ID, received: 1n }, false],
		[{ status: "failed-on-destination", messageId: MESSAGE_ID }, false],
		[{ status: "unconfirmed", messageId: MESSAGE_ID }, false],
	])("finalized transfer with arrival %o: %s", (arrival, expected) => {
		expect(isAwaitingXcmArrival(finalized, arrival)).toBe(expected);
	});

	it("does not hold a transfer that failed on the origin chain", () => {
		expect(isAwaitingXcmArrival(getRecord("failed"), null)).toBe(false);
	});

	it("does not hold other transactions", () => {
		expect(isAwaitingXcmArrival({ ...finalized, type: "swap" }, null)).toBe(
			false,
		);
	});
});
