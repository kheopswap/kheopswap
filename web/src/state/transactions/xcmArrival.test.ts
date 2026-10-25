import { range } from "lodash-es";
import { BehaviorSubject, firstValueFrom, Subject, throwError } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dotFromPeople } from "../../features/swap/routes/xcm/xcmFromPeople.fixtures";
import {
	usdtToPinkDust,
	usdtToPinkPriceMoved,
	type XcmDestinationSwapFixture,
} from "../../features/swap/routes/xcmDestinationSwap/xcmDestinationSwap.fixtures";
import { getChainById } from "../../registry/chains/chains";
import { parseTokenId } from "../../registry/tokens/helpers";
import { clearCachedObservables } from "../../utils/getCachedObservable";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { XcmDepositTarget } from "../../utils/xcmDeposit";
import {
	addTransaction,
	dismissTransaction,
	transactions$,
} from "./transactionStore";
import type { FollowUpTxEvent, TransactionRecord } from "./types";
import {
	type DestinationBlock,
	describeFailedArrival,
	findArrival,
	getArrivalBufferBlocks,
	getSentMessage,
	getTrackedXcmArrival,
	getXcmArrival$,
	getXcmBlockEvents,
	isAwaitingXcmArrival,
	isXcmArrivalType,
	trackXcmArrivals,
	type XcmArrival,
} from "./xcmArrival";

type BlockRecords = { phase: { type: string }; event: TxEvents[number] }[];
type BlockUpdate = {
	block: { number: number; hash: string };
	value: BlockRecords;
};

const chains = vi.hoisted(() => ({
	streams: {} as Record<
		string,
		(at: "best" | "finalized") => import("rxjs").Observable<unknown>
	>,
	pastBlocks: {} as Record<number, BlockRecords>,
	pastReads: [] as { number: number; tipHash: string }[],
}));

vi.mock("../../papi/getApi", async () => {
	const { of } = await import("rxjs");
	return {
		getApi$: (chainId: string) =>
			of({
				query: {
					System: {
						Events: {
							watchValue: ({ at }: { at: "best" | "finalized" }) =>
								chains.streams[chainId]?.(at),
							getValue: async ({ at }: { at: string }) => {
								const block =
									chains.pastBlocks[Number(at.replace("0xhash", ""))];
								if (!block) throw new Error(`block ${at} unavailable`);
								return block;
							},
						},
						BlockHash: {
							getValue: async (number: number, { at }: { at: string }) => {
								chains.pastReads.push({ number, tipHash: at });
								return `0xhash${number}`;
							},
						},
					},
				},
			}),
	};
});

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
const returnTokenIds = [target.tokenId];

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

const block = (events: TxEvents): DestinationBlock => ({
	type: "block",
	events,
});
const UNREACHABLE: DestinationBlock = { type: "unreachable" };

const getRecord = (
	status: TransactionRecord["status"],
	events: TxEvents = [],
	txEvents: FollowUpTxEvent[] = events.length
		? [{ type: "inBestBlock", ok: true, events } as FollowUpTxEvent]
		: [{ type: "pending" }],
): TransactionRecord =>
	({
		id: "tx",
		type: "xcmTransfer",
		status,
		txEvents,
	}) as unknown as TransactionRecord;

const finalizedRecord = (events: TxEvents): TransactionRecord =>
	getRecord("finalized", events, [
		{ type: "inBestBlock", ok: true, events } as FollowUpTxEvent,
		{ type: "finalized", ok: true, events } as FollowUpTxEvent,
	]);

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
		expect(
			findArrival(ourArrival, {
				messageId: MESSAGE_ID,
				target,
				returnTokenIds,
			}),
		).toEqual({
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
				{ messageId: MESSAGE_ID, target, returnTokenIds },
			),
		).toEqual({ success: true, received: 9995190152n });
	});

	it("ignores deposits of other assets", () => {
		expect(
			findArrival([deposited(BENEFICIARY, 7n, 10), ...ourArrival], {
				messageId: MESSAGE_ID,
				target,
				returnTokenIds,
			}),
		).toEqual({ success: true, received: 9995190152n });
	});

	it("matches the message id regardless of hex case", () => {
		expect(
			findArrival(ourArrival, {
				messageId: MESSAGE_ID.toUpperCase().replace("0X", "0x"),
				target,
				returnTokenIds,
			}),
		).toEqual({ success: true, received: 9995190152n });
	});

	it("reports a failed execution without a received amount", () => {
		expect(
			findArrival(
				[deposited(FEE_RECEIVER, 3847879n), processed(MESSAGE_ID, false)],
				{ messageId: MESSAGE_ID, target, returnTokenIds },
			),
		).toEqual({ success: false, returned: [], trapped: false });
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
				{ messageId: MESSAGE_ID, target, returnTokenIds },
			),
		).toEqual({ success: false, returned: [], trapped: false });
	});

	it("returns null for a block that did not process our message", () => {
		expect(
			findArrival([deposited(BENEFICIARY, 123n), processed(OTHER_MESSAGE_ID)], {
				messageId: MESSAGE_ID,
				target,
				returnTokenIds,
			}),
		).toBeNull();
	});
});

describe("getSentMessage", () => {
	it("reads the id of the message sent to Hydration from a best block as provisional", () => {
		expect(
			getSentMessage(
				getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]).txEvents,
				HYDRATION_PARA_ID,
			),
		).toEqual({ messageId: MESSAGE_ID, finalized: false });
	});

	it("reads the id from the finalized block as final", () => {
		expect(
			getSentMessage(
				finalizedRecord([sentTo(HYDRATION_PARA_ID)]).txEvents,
				HYDRATION_PARA_ID,
			),
		).toEqual({ messageId: MESSAGE_ID, finalized: true });
	});

	it("prefers the id of the finalized inclusion over a retracted best block", () => {
		expect(
			getSentMessage(
				[
					{
						type: "inBestBlock",
						ok: true,
						events: [sentTo(HYDRATION_PARA_ID, OTHER_MESSAGE_ID)],
					} as FollowUpTxEvent,
					{ type: "notInBestBlock" } as FollowUpTxEvent,
					{
						type: "inBestBlock",
						ok: true,
						events: [sentTo(HYDRATION_PARA_ID)],
					} as FollowUpTxEvent,
					{
						type: "finalized",
						ok: true,
						events: [sentTo(HYDRATION_PARA_ID)],
					} as FollowUpTxEvent,
				],
				HYDRATION_PARA_ID,
			),
		).toEqual({ messageId: MESSAGE_ID, finalized: true });
	});

	it("forgets the id of a block the chain retracted", () => {
		expect(
			getSentMessage(
				[
					{
						type: "inBestBlock",
						ok: true,
						events: [sentTo(HYDRATION_PARA_ID)],
					} as FollowUpTxEvent,
					{ type: "notInBestBlock" } as FollowUpTxEvent,
				],
				HYDRATION_PARA_ID,
			),
		).toBeNull();
	});

	it("ignores messages sent to other chains", () => {
		expect(
			getSentMessage(
				getRecord("inBlock", [sentTo(1002)]).txEvents,
				HYDRATION_PARA_ID,
			),
		).toBeNull();
	});

	it("returns null before the transaction is included", () => {
		expect(
			getSentMessage(getRecord("broadcasted").txEvents, HYDRATION_PARA_ID),
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
		const bestBlockEvents$ = new Subject<DestinationBlock>();
		const finalizedBlockEvents$ = new Subject<DestinationBlock>();
		const arrivals: XcmArrival[] = [];
		let isComplete = false;
		getXcmArrival$({
			record$,
			bestBlockEvents$,
			finalizedBlockEvents$,
			target,
			returnTokenIds,
			destinationParaId: HYDRATION_PARA_ID,
			bufferBlocks,
			timeoutMs,
		}).subscribe({
			next: (arrival) => arrivals.push(arrival),
			complete: () => {
				isComplete = true;
			},
		});
		return {
			record$,
			bestBlockEvents$,
			finalizedBlockEvents$,
			arrivals,
			isComplete: () => isComplete,
		};
	};

	afterEach(() => {
		vi.useRealTimers();
	});

	it("follows the transfer from the wallet prompt to its finalized arrival on Hydration", () => {
		const {
			record$,
			bestBlockEvents$,
			finalizedBlockEvents$,
			arrivals,
			isComplete,
		} = track(getRecord("pending"));
		bestBlockEvents$.next(block([processed(OTHER_MESSAGE_ID)]));
		record$.next(getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]));
		bestBlockEvents$.next(block([]));
		bestBlockEvents$.next(block(ourArrival));
		expect(isComplete()).toBe(false);
		record$.next(finalizedRecord([sentTo(HYDRATION_PARA_ID)]));
		finalizedBlockEvents$.next(block(ourArrival));

		expect(arrivals).toEqual([
			{ status: "awaiting-origin" },
			{ status: "in-transit", messageId: MESSAGE_ID },
			{
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 9995190152n,
				finalized: false,
			},
			{
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 9995190152n,
				finalized: true,
			},
		]);
		expect(isComplete()).toBe(true);
	});

	it("ends on the finalized destination block even when the origin is still waiting for finality", () => {
		const { finalizedBlockEvents$, arrivals, isComplete } = track(
			getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]),
		);
		finalizedBlockEvents$.next(block(ourArrival));

		expect(arrivals.at(-1)).toMatchObject({
			status: "arrived",
			finalized: true,
		});
		expect(isComplete()).toBe(true);
	});

	it("switches to the message id of the canonical inclusion when the best block is retracted", () => {
		const { record$, bestBlockEvents$, finalizedBlockEvents$, arrivals } =
			track(
				getRecord("inBlock", [sentTo(HYDRATION_PARA_ID, OTHER_MESSAGE_ID)]),
			);
		bestBlockEvents$.next(block([]));
		expect(arrivals.at(-1)).toEqual({
			status: "in-transit",
			messageId: OTHER_MESSAGE_ID,
		});

		record$.next(
			getRecord(
				"finalized",
				[],
				[
					{
						type: "inBestBlock",
						ok: true,
						events: [sentTo(HYDRATION_PARA_ID, OTHER_MESSAGE_ID)],
					} as FollowUpTxEvent,
					{ type: "notInBestBlock" } as FollowUpTxEvent,
					{
						type: "finalized",
						ok: true,
						events: [sentTo(HYDRATION_PARA_ID)],
					} as FollowUpTxEvent,
				],
			),
		);
		finalizedBlockEvents$.next(block(ourArrival));

		expect(arrivals.at(-1)).toEqual({
			status: "arrived",
			messageId: MESSAGE_ID,
			received: 9995190152n,
			finalized: true,
		});
	});

	it("keeps a best-block arrival provisional and does not complete on it", () => {
		const { bestBlockEvents$, arrivals, isComplete } = track(
			finalizedRecord([sentTo(HYDRATION_PARA_ID)]),
		);
		bestBlockEvents$.next(block(ourArrival));

		expect(arrivals.at(-1)).toMatchObject({
			status: "arrived",
			finalized: false,
		});
		expect(isComplete()).toBe(false);
	});

	it("catches an arrival processed before the origin events reveal the message id", () => {
		const { record$, bestBlockEvents$, arrivals } = track(getRecord("pending"));
		bestBlockEvents$.next(block(ourArrival));
		bestBlockEvents$.next(block([]));
		record$.next(getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]));

		expect(arrivals.at(-1)).toEqual({
			status: "arrived",
			messageId: MESSAGE_ID,
			received: 9995190152n,
			finalized: false,
		});
	});

	it("ends when the record is dismissed before the origin settles", () => {
		const { record$, bestBlockEvents$, arrivals, isComplete } = track(
			getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]),
		);
		record$.next(undefined);
		bestBlockEvents$.next(block(ourArrival));

		expect(arrivals).toEqual([{ status: "in-transit", messageId: MESSAGE_ID }]);
		expect(isComplete()).toBe(true);
	});

	it("stops tracking when the record is dismissed after the origin finalized", () => {
		const { record$, finalizedBlockEvents$, arrivals, isComplete } = track(
			finalizedRecord([sentTo(HYDRATION_PARA_ID)]),
		);
		record$.next(undefined);
		finalizedBlockEvents$.next(block(ourArrival));

		expect(arrivals).toEqual([{ status: "in-transit", messageId: MESSAGE_ID }]);
		expect(isComplete()).toBe(true);
	});

	it("reports a failure on Hydration once finalized", () => {
		const { bestBlockEvents$, finalizedBlockEvents$, arrivals, isComplete } =
			track(finalizedRecord([sentTo(HYDRATION_PARA_ID)]));
		bestBlockEvents$.next(block([processed(MESSAGE_ID, false)]));
		expect(arrivals.at(-1)).toEqual({
			status: "failed-on-destination",
			messageId: MESSAGE_ID,
			returned: [],
			trapped: false,
			finalized: false,
		});
		expect(isComplete()).toBe(false);

		finalizedBlockEvents$.next(block([processed(MESSAGE_ID, false)]));
		expect(arrivals.at(-1)).toEqual({
			status: "failed-on-destination",
			messageId: MESSAGE_ID,
			returned: [],
			trapped: false,
			finalized: true,
		});
		expect(isComplete()).toBe(true);
	});

	it("keeps waiting when a failed best-block inclusion may still be retracted", () => {
		const { record$, finalizedBlockEvents$, arrivals, isComplete } = track(
			getRecord("pending"),
		);
		record$.next(
			getRecord(
				"failed",
				[],
				[
					{
						type: "inBestBlock",
						ok: false,
						events: [],
					} as unknown as FollowUpTxEvent,
				],
			),
		);
		expect(arrivals).toEqual([{ status: "awaiting-origin" }]);
		expect(isComplete()).toBe(false);

		record$.next(finalizedRecord([sentTo(HYDRATION_PARA_ID)]));
		finalizedBlockEvents$.next(block(ourArrival));
		expect(arrivals.at(-1)).toMatchObject({
			status: "arrived",
			finalized: true,
		});
	});

	it("stops when the origin transaction fails in a finalized block", () => {
		const { record$, arrivals, isComplete } = track(getRecord("pending"));
		record$.next(
			getRecord(
				"failed",
				[],
				[
					{
						type: "inBestBlock",
						ok: false,
						events: [],
					} as unknown as FollowUpTxEvent,
					{
						type: "finalized",
						ok: false,
						events: [],
					} as unknown as FollowUpTxEvent,
				],
			),
		);

		expect(arrivals.at(-1)).toEqual({ status: "origin-failed" });
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

	it("ends when the app could not confirm the origin transaction", () => {
		const { record$, arrivals, isComplete } = track(getRecord("pending"));
		record$.next(getRecord("unknown", [], [{ type: "unknown" }]));

		expect(arrivals).toEqual([
			{ status: "awaiting-origin" },
			{ status: "unconfirmed", messageId: null },
		]);
		expect(isComplete()).toBe(true);
	});

	it("catches an arrival processed many fast Asset Hub blocks before the message id is known", () => {
		const { record$, finalizedBlockEvents$, arrivals } = track(
			getRecord("pending"),
			undefined,
			getArrivalBufferBlocks("pah"),
		);
		finalizedBlockEvents$.next(block(ourArrival));
		for (let i = 0; i < 20; i++) finalizedBlockEvents$.next(block([]));
		record$.next(getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]));

		expect(arrivals.at(-1)?.status).toBe("arrived");
	});

	it("gives up as unconfirmed when nothing is finalized before the timeout, even after a best-block arrival", () => {
		vi.useFakeTimers();
		const { bestBlockEvents$, arrivals, isComplete } = track(
			getRecord("inBlock", [sentTo(HYDRATION_PARA_ID)]),
			60_000,
		);
		bestBlockEvents$.next(block(ourArrival));
		vi.advanceTimersByTime(59_999);
		expect(arrivals.at(-1)?.status).toBe("arrived");
		vi.advanceTimersByTime(1);

		expect(arrivals.at(-1)).toEqual({
			status: "unconfirmed",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(true);
	});

	it("reports an unreachable destination and gives up as unconfirmed at the expiry", () => {
		vi.useFakeTimers();
		const { bestBlockEvents$, arrivals, isComplete } = track(
			finalizedRecord([sentTo(HYDRATION_PARA_ID)]),
			60_000,
		);
		bestBlockEvents$.next(UNREACHABLE);
		expect(arrivals.at(-1)).toEqual({
			status: "unreachable",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(false);

		bestBlockEvents$.next(block([]));
		expect(arrivals.at(-1)).toEqual({
			status: "in-transit",
			messageId: MESSAGE_ID,
		});

		bestBlockEvents$.next(UNREACHABLE);
		vi.advanceTimersByTime(60_000);
		expect(arrivals.at(-1)).toEqual({
			status: "unconfirmed",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(true);
	});

	it("resolves a finalized origin that sent no message as unconfirmed", () => {
		const { arrivals, isComplete } = track(finalizedRecord([]));

		expect(arrivals).toEqual([{ status: "unconfirmed", messageId: null }]);
		expect(isComplete()).toBe(true);
	});

	it("keeps waiting for the origin while the record is unsettled", () => {
		vi.useFakeTimers();
		const { arrivals, isComplete } = track(getRecord("pending"), 60_000);
		vi.advanceTimersByTime(11 * 60_000);

		expect(arrivals).toEqual([{ status: "awaiting-origin" }]);
		expect(isComplete()).toBe(false);
	});

	it("reports the arrival of a transfer whose origin finalized after 11 minutes", () => {
		vi.useFakeTimers();
		const { record$, finalizedBlockEvents$, arrivals, isComplete } = track(
			getRecord("pending"),
		);
		vi.advanceTimersByTime(11 * 60_000);
		record$.next(finalizedRecord([sentTo(HYDRATION_PARA_ID)]));
		expect(arrivals.at(-1)).toEqual({
			status: "in-transit",
			messageId: MESSAGE_ID,
		});

		finalizedBlockEvents$.next(block(ourArrival));
		expect(arrivals.at(-1)).toMatchObject({
			status: "arrived",
			finalized: true,
		});
		expect(isComplete()).toBe(true);
	});

	it("gives up as unconfirmed 10 minutes after the origin sent the message, not after the record was created", () => {
		vi.useFakeTimers();
		const { record$, arrivals, isComplete } = track(getRecord("pending"));
		vi.advanceTimersByTime(5 * 60_000);
		record$.next(finalizedRecord([sentTo(HYDRATION_PARA_ID)]));
		vi.advanceTimersByTime(10 * 60_000 - 1);
		expect(arrivals.at(-1)).toEqual({
			status: "in-transit",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(false);

		vi.advanceTimersByTime(1);
		expect(arrivals.at(-1)).toEqual({
			status: "unconfirmed",
			messageId: MESSAGE_ID,
		});
		expect(isComplete()).toBe(true);
	});
});

describe("trackXcmArrivals", () => {
	const getTrackedRecord = (
		id: string,
		destinationTokenId: string,
	): TransactionRecord =>
		({
			...finalizedRecord([
				sentTo(getChainById(parseTokenId(destinationTokenId).chainId).paraId),
			]),
			id,
			followUpData: {
				target: { tokenId: destinationTokenId, beneficiary: BENEFICIARY },
				returnTokenIds: [destinationTokenId],
			},
		}) as unknown as TransactionRecord;

	const inPhase = (events: TxEvents): BlockRecords =>
		events.map((event) => ({ phase: { type: "Finalization" }, event }));

	const atBlock = (number: number, events: TxEvents): BlockUpdate => ({
		block: { number, hash: `0xtip${number}` },
		value: inPhase(events),
	});

	afterEach(async () => {
		for (const tx of await firstValueFrom(transactions$))
			dismissTransaction(tx.id);
		clearCachedObservables();
		chains.streams = {};
		chains.pastBlocks = {};
		chains.pastReads = [];
		vi.useRealTimers();
	});

	it("reads back the finalized blocks that watchValue skipped", async () => {
		const finalized$ = new Subject<BlockUpdate>();
		chains.streams = {
			hydration: (at) => (at === "finalized" ? finalized$ : new Subject()),
		};
		chains.pastBlocks = { 11: inPhase([]), 12: inPhase(ourArrival) };
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		finalized$.next(atBlock(10, []));
		finalized$.next(atBlock(13, []));
		await vi.waitFor(() =>
			expect(getTrackedXcmArrival("to-hydration")?.status).toBe("arrived"),
		);

		expect(chains.pastReads).toEqual([
			{ number: 11, tipHash: "0xtip13" },
			{ number: 12, tipHash: "0xtip13" },
		]);
		expect(getTrackedXcmArrival("to-hydration")).toMatchObject({
			received: 9995190152n,
			finalized: true,
		});
		subscription.unsubscribe();
	});

	it("reads back no more than the buffer window after a long gap", async () => {
		const finalized$ = new Subject<BlockUpdate>();
		chains.streams = {
			hydration: (at) => (at === "finalized" ? finalized$ : new Subject()),
		};
		chains.pastBlocks = Object.fromEntries(
			range(90, 100).map((number) => [
				number,
				inPhase(number === 95 ? ourArrival : []),
			]),
		);
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		finalized$.next(atBlock(10, []));
		finalized$.next(atBlock(100, []));
		await vi.waitFor(() =>
			expect(getTrackedXcmArrival("to-hydration")?.status).toBe("arrived"),
		);

		expect(chains.pastReads.map(({ number }) => number)).toEqual(
			range(90, 100),
		);
		subscription.unsubscribe();
	});

	it("skips a block it cannot read and goes on with the next ones", async () => {
		const finalized$ = new Subject<BlockUpdate>();
		chains.streams = {
			hydration: (at) => (at === "finalized" ? finalized$ : new Subject()),
		};
		chains.pastBlocks = { 12: inPhase(ourArrival) };
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		finalized$.next(atBlock(10, []));
		finalized$.next(atBlock(13, []));
		await vi.waitFor(() =>
			expect(getTrackedXcmArrival("to-hydration")?.status).toBe("arrived"),
		);

		expect(chains.pastReads.map(({ number }) => number)).toEqual([11, 12]);
		subscription.unsubscribe();
	});

	it("forgets the arrival of a dismissed record", async () => {
		const hydration$ = new Subject<BlockUpdate>();
		chains.streams = { hydration: () => hydration$ };
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		hydration$.next(atBlock(1, ourArrival));
		await vi.waitFor(() =>
			expect(getTrackedXcmArrival("to-hydration")?.status).toBe("arrived"),
		);

		dismissTransaction("to-hydration");
		expect(getTrackedXcmArrival("to-hydration")).toBeNull();
		subscription.unsubscribe();
	});

	it("does not read back anything when the best chain switches to a sibling or shorter branch", async () => {
		const best$ = new Subject<BlockUpdate>();
		chains.streams = {
			hydration: (at) => (at === "best" ? best$ : new Subject()),
		};
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		best$.next(atBlock(100, []));
		best$.next(atBlock(100, []));
		best$.next(atBlock(99, []));
		best$.next(atBlock(100, ourArrival));
		await vi.waitFor(() =>
			expect(getTrackedXcmArrival("to-hydration")?.status).toBe("arrived"),
		);

		expect(chains.pastReads).toEqual([]);
		subscription.unsubscribe();
	});

	it("reads back the blocks missed while the destination stream was down", async () => {
		vi.useFakeTimers();
		const first$ = new Subject<BlockUpdate>();
		const second$ = new Subject<BlockUpdate>();
		let attempts = 0;
		chains.streams = {
			hydration: (at) =>
				at === "finalized"
					? ++attempts === 1
						? first$
						: second$
					: new Subject(),
		};
		chains.pastBlocks = { 11: inPhase([]), 12: inPhase(ourArrival) };
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		first$.next(atBlock(10, []));
		first$.error(new Error("rpc down"));
		await vi.advanceTimersByTimeAsync(10_000);
		second$.next(atBlock(13, []));
		await vi.advanceTimersByTimeAsync(0);

		expect(chains.pastReads).toEqual([
			{ number: 11, tipHash: "0xtip13" },
			{ number: 12, tipHash: "0xtip13" },
		]);
		expect(getTrackedXcmArrival("to-hydration")).toMatchObject({
			status: "arrived",
			finalized: true,
		});
		subscription.unsubscribe();
	});

	it("keeps retrying an unreachable Hydration until the expiry while tracking Asset Hub", () => {
		vi.useFakeTimers();
		const assetHub$ = new Subject<BlockUpdate>();
		let hydrationAttempts = 0;
		chains.streams = {
			hydration: () => {
				hydrationAttempts += 1;
				return throwError(() => new Error("hydration rpc down"));
			},
			pah: () => assetHub$,
		};
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		addTransaction(getTrackedRecord("to-asset-hub", "native::pah"));
		vi.advanceTimersByTime(60_000);
		assetHub$.next(
			atBlock(1, [
				{
					type: "Balances",
					value: { type: "Deposit", value: { who: BENEFICIARY, amount: 7n } },
				},
				processed(MESSAGE_ID),
			]),
		);

		expect(getTrackedXcmArrival("to-hydration")).toEqual({
			status: "unreachable",
			messageId: MESSAGE_ID,
		});
		expect(getTrackedXcmArrival("to-asset-hub")).toEqual({
			status: "arrived",
			messageId: MESSAGE_ID,
			received: 7n,
			finalized: true,
		});
		const attemptsInFirstMinute = hydrationAttempts;
		expect(attemptsInFirstMinute).toBe(2 * 3);

		vi.advanceTimersByTime(9 * 60_000);
		expect(getTrackedXcmArrival("to-hydration")).toEqual({
			status: "unconfirmed",
			messageId: MESSAGE_ID,
		});
		expect(hydrationAttempts).toBeGreaterThan(attemptsInFirstMinute);
		subscription.unsubscribe();
	});

	it("shares one block stream per destination and finality between transfers", async () => {
		const hydration$ = new Subject<BlockUpdate>();
		let subscriptions = 0;
		chains.streams = {
			hydration: () => {
				subscriptions += 1;
				return hydration$;
			},
		};
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("first", target.tokenId));
		addTransaction(getTrackedRecord("second", target.tokenId));
		hydration$.next(atBlock(1, ourArrival));
		await vi.waitFor(() =>
			expect(getTrackedXcmArrival("second")?.status).toBe("arrived"),
		);

		expect(subscriptions).toBe(2);
		expect(getTrackedXcmArrival("first")?.status).toBe("arrived");
		subscription.unsubscribe();
	});

	it("keeps tracking the other transfers when one record cannot be tracked", () => {
		const hydration$ = new Subject<BlockUpdate>();
		chains.streams = { hydration: () => hydration$ };
		const subscription = trackXcmArrivals();
		addTransaction({
			...getTrackedRecord("malformed", target.tokenId),
			followUpData: { target: undefined },
		} as unknown as TransactionRecord);
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		hydration$.next(atBlock(1, ourArrival));

		expect(getTrackedXcmArrival("malformed")).toBeNull();
		expect(getTrackedXcmArrival("to-hydration")).toMatchObject({
			status: "arrived",
			received: 9995190152n,
		});
		subscription.unsubscribe();
	});

	it("retries a destination stream that fails once", () => {
		vi.useFakeTimers();
		let attempts = 0;
		const hydration$ = new Subject<BlockUpdate>();
		chains.streams = {
			hydration: () =>
				++attempts === 1
					? throwError(() => new Error("transient"))
					: hydration$,
		};
		const subscription = trackXcmArrivals();
		addTransaction(getTrackedRecord("to-hydration", target.tokenId));
		vi.advanceTimersByTime(10_000);
		hydration$.next(atBlock(1, ourArrival));

		expect(getTrackedXcmArrival("to-hydration")).toMatchObject({
			status: "arrived",
			received: 9995190152n,
		});
		subscription.unsubscribe();
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
				returnTokenIds: [assetHubTarget.tokenId],
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
		expect(getSentMessage(sent.txEvents, PEOPLE_PARA_ID)?.messageId).toBe(
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
				returnTokenIds: [peopleTarget.tokenId],
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
		expect(
			getSentMessage(record.txEvents, getChainById("pah").paraId)?.messageId,
		).toBe(
			"0x683cf77a60b984103a1a86f1dbb9e61e86e4d88453c30d67e7cdda47eb555b85",
		);
	});

	it("finds the DOT a People teleport deposited in Polkadot Asset Hub block 22023474", () => {
		const sent = getRecord("finalized", [
			sentTo(getChainById("pah").paraId, PEOPLE_MESSAGE_ID),
		]);
		expect(
			getSentMessage(sent.txEvents, getChainById("pah").paraId)?.messageId,
		).toBe(PEOPLE_MESSAGE_ID);
		expect(
			findArrival(getXcmBlockEvents(ASSET_HUB_BLOCK_22023474), {
				messageId: PEOPLE_MESSAGE_ID,
				target: { tokenId: "native::pah", beneficiary: PEOPLE_BENEFICIARY },
				returnTokenIds: ["native::pah"],
			}),
		).toEqual({ success: true, received: 7791782414n });
	});
});

describe("isAwaitingXcmArrival", () => {
	const finalized = finalizedRecord([sentTo(HYDRATION_PARA_ID)]);

	it.each<[XcmArrival | null, boolean]>([
		[null, true],
		[{ status: "awaiting-origin" }, true],
		[{ status: "in-transit", messageId: MESSAGE_ID }, true],
		[
			{
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 1n,
				finalized: false,
			},
			true,
		],
		[
			{
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 1n,
				finalized: true,
			},
			false,
		],
		[
			{
				status: "failed-on-destination",
				messageId: MESSAGE_ID,
				returned: [],
				trapped: false,
				finalized: false,
			},
			true,
		],
		[
			{
				status: "failed-on-destination",
				messageId: MESSAGE_ID,
				returned: [],
				trapped: false,
				finalized: true,
			},
			false,
		],
		[{ status: "unconfirmed", messageId: MESSAGE_ID }, false],
	])("finalized transfer with arrival %o: %s", (arrival, expected) => {
		expect(isAwaitingXcmArrival(finalized, arrival)).toBe(expected);
	});

	it("does not hold a transfer that failed on the origin chain", () => {
		expect(isAwaitingXcmArrival(getRecord("failed"), null)).toBe(false);
	});

	it("does not hold other transactions", () => {
		expect(
			isAwaitingXcmArrival(
				{ ...finalized, type: "transfer", followUpData: undefined },
				null,
			),
		).toBe(false);
	});
});

describe("arrival of a swap that failed on Asset Hub", () => {
	const DOT = "native::pah";
	const USDT = "asset::pah::1984";
	const PINK = "asset::pah::23";

	const getFailedSwapBlock = ({
		destinationDryRun,
	}: XcmDestinationSwapFixture) => {
		if (!destinationDryRun.success) throw new Error("expected a dry run");
		const events = destinationDryRun.value.emitted_events as TxEvents;
		const messageId = events.flatMap(({ type, value }) =>
			type === "PolkadotXcm" && value.type === "ProcessXcmError"
				? [value.value.message_id]
				: [],
		)[0];
		if (!messageId) throw new Error("expected a failed message");
		return { messageId, events: [...events, processed(messageId, false)] };
	};

	const findFailedSwap = (fixture: XcmDestinationSwapFixture) => {
		const { messageId, events } = getFailedSwapBlock(fixture);
		return findArrival(events, {
			messageId,
			target: { tokenId: PINK, beneficiary: fixture.beneficiary },
			returnTokenIds: [USDT, DOT, PINK],
		});
	};

	it("reports the DOT and the unused USDT fee returned to the beneficiary", () => {
		const arrival = findFailedSwap(usdtToPinkPriceMoved);

		expect(arrival).toEqual({
			success: false,
			returned: [
				{ tokenId: USDT, plancks: expect.any(BigInt) },
				{ tokenId: DOT, plancks: usdtToPinkPriceMoved.hops[0]?.amountOut },
			],
			trapped: false,
		});
		if (arrival?.success !== false) throw new Error("expected a failure");
		expect(describeFailedArrival(arrival)).toBe("funds returned");
	});

	it("reports the dust Asset Hub trapped next to the DOT it returned", () => {
		const arrival = findFailedSwap(usdtToPinkDust);

		expect(arrival).toEqual({
			success: false,
			returned: [{ tokenId: DOT, plancks: usdtToPinkDust.hops[0]?.amountOut }],
			trapped: true,
		});
		if (arrival?.success !== false) throw new Error("expected a failure");
		expect(describeFailedArrival(arrival)).toBe("some assets trapped");
	});

	it("does not blame our message for assets another message trapped", () => {
		const trapped = getFailedSwapBlock(usdtToPinkDust).events.filter(
			({ type, value }) =>
				type === "PolkadotXcm" && value.type === "AssetsTrapped",
		);

		expect(
			findArrival(
				[...trapped, processed(OTHER_MESSAGE_ID), processed(MESSAGE_ID, false)],
				{
					messageId: MESSAGE_ID,
					target,
					returnTokenIds,
				},
			),
		).toEqual({ success: false, returned: [], trapped: false });
	});

	it.each([
		[{ returned: [], trapped: true }, "assets trapped"],
		[{ returned: [], trapped: false }, null],
	])("describes a failure with %o as %s", (failure, description) => {
		expect(describeFailedArrival(failure)).toBe(description);
	});
});
