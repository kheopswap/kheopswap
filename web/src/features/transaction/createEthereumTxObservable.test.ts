import type { TxEvent } from "polkadot-api";
import { lastValueFrom, toArray } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import { createEthereumTxObservable } from "./createEthereumTxObservable";

const BEST_HASH = "0xbest";
const FINALIZED_HASH = "0xfinal";
const TX_HASH = "0xtx";

const chain = vi.hoisted(() => ({
	finalizedHash: "0xbest" as string,
	receipts: [] as {
		blockHash: string;
		transactionIndex: number;
		status?: "success" | "reverted";
	}[],
	eventsByHash: {} as Record<string, unknown[] | Error>,
}));

const inExtrinsic = (index: number, type: string, value: unknown) => ({
	phase: { type: "ApplyExtrinsic", value: index },
	event: { type, value },
	topics: [],
});

vi.mock("../../papi/getApi", () => ({
	getApi: async () => ({
		chainId: "pah",
		query: {
			System: {
				BlockHash: {
					getValue: async (_number: number, { at }: { at: string }) =>
						at === "best" ? "0xbest" : chain.finalizedHash,
				},
				Events: {
					getValue: async ({ at }: { at: string }) => {
						const events = chain.eventsByHash[at];
						if (events instanceof Error) throw events;
						return events;
					},
				},
			},
		},
	}),
}));

vi.mock("../../utils/getBlockDurationMs", () => ({
	getBlockDurationMs: async () => 10,
}));

vi.mock("../../utils/sleep", () => ({ sleep: async () => {} }));

vi.mock("viem", async (importOriginal) => ({
	...(await importOriginal<typeof import("viem")>()),
	createPublicClient: () => ({
		getTransactionReceipt: async () => {
			const receipt =
				chain.receipts.length > 1 ? chain.receipts.shift() : chain.receipts[0];
			return { status: "success", ...receipt, blockNumber: 7n };
		},
	}),
}));

const request = vi.fn(async () => TX_HASH);

const track = () =>
	lastValueFrom(
		createEthereumTxObservable({
			account: {
				platform: "ethereum",
				address: "0x1",
				client: { request: request as never },
			},
			chainId: "pah",
			callData: "0xcall",
		}).pipe(toArray()),
	);

const successAt = (index: number) =>
	inExtrinsic(index, "System", { type: "ExtrinsicSuccess", value: {} });

beforeEach(() => {
	request.mockClear();
	chain.finalizedHash = BEST_HASH;
	chain.receipts = [{ blockHash: BEST_HASH, transactionIndex: 2 }];
	chain.eventsByHash = {
		[BEST_HASH]: [
			inExtrinsic(2, "Balances", { type: "Transfer", value: { amount: 1n } }),
			successAt(2),
		],
		[FINALIZED_HASH]: [
			inExtrinsic(0, "Balances", { type: "Transfer", value: { amount: 9n } }),
			inExtrinsic(1, "Balances", { type: "Transfer", value: { amount: 1n } }),
			successAt(1),
		],
	};
});

describe("createEthereumTxObservable", () => {
	it("sends the transaction with the target chain id", async () => {
		await track();

		expect(request).toHaveBeenCalledWith({
			method: "eth_sendTransaction",
			params: [
				expect.objectContaining({
					chainId: `0x${getChainById("pah").evmChainId.toString(16)}`,
					data: "0xcall",
				}),
			],
		});
	});

	it("finalizes with the best block's events when that block is finalized", async () => {
		const events = await track();

		expect(events.map(({ type }) => type)).toEqual([
			"broadcasted",
			"inBestBlock",
			"finalized",
		]);
		const finalized = events.at(-1) as Extract<TxEvent, { type: "finalized" }>;
		expect(finalized.block).toEqual({ hash: BEST_HASH, number: 7, index: 2 });
		expect(finalized.events.map(({ value }) => value)).toEqual([
			{ type: "Transfer", value: { amount: 1n } },
			{ type: "ExtrinsicSuccess", value: {} },
		]);
	});

	it("re-reads the inclusion when the receipt moved to another index of the finalized block", async () => {
		chain.eventsByHash[BEST_HASH] = [
			inExtrinsic(1, "Balances", { type: "Transfer", value: { amount: 1n } }),
			successAt(1),
			inExtrinsic(2, "Balances", { type: "Transfer", value: { amount: 5n } }),
			successAt(2),
		];
		chain.receipts = [
			{ blockHash: BEST_HASH, transactionIndex: 2 },
			{ blockHash: BEST_HASH, transactionIndex: 1 },
		];

		const events = await track();

		const finalized = events.at(-1) as Extract<TxEvent, { type: "finalized" }>;
		expect(finalized.block).toEqual({ hash: BEST_HASH, number: 7, index: 1 });
		expect(finalized.events.map(({ value }) => value)).toEqual([
			{ type: "Transfer", value: { amount: 1n } },
			{ type: "ExtrinsicSuccess", value: {} },
		]);
	});

	it("reports the canonical receipt's outcome when the finalized block's events cannot be read", async () => {
		chain.finalizedHash = FINALIZED_HASH;
		chain.eventsByHash[FINALIZED_HASH] = new Error("rpc down");
		chain.receipts = [
			{ blockHash: BEST_HASH, transactionIndex: 2 },
			{ blockHash: BEST_HASH, transactionIndex: 2 },
			{ blockHash: FINALIZED_HASH, transactionIndex: 1, status: "reverted" },
		];

		const events = await track();

		expect(events.at(-1)).toMatchObject({
			type: "finalized",
			ok: false,
			block: { hash: FINALIZED_HASH, index: 1 },
		});
	});

	it("reads the finalized events from the finalized block when it differs from the best block", async () => {
		chain.finalizedHash = FINALIZED_HASH;
		chain.receipts = [
			{ blockHash: BEST_HASH, transactionIndex: 2 },
			{ blockHash: BEST_HASH, transactionIndex: 2 },
			{ blockHash: FINALIZED_HASH, transactionIndex: 1 },
		];

		const events = await track();

		const finalized = events.at(-1) as Extract<TxEvent, { type: "finalized" }>;
		expect(finalized.block).toEqual({
			hash: FINALIZED_HASH,
			number: 7,
			index: 1,
		});
		expect(finalized.events.map(({ value }) => value)).toEqual([
			{ type: "Transfer", value: { amount: 1n } },
			{ type: "ExtrinsicSuccess", value: {} },
		]);
	});
});
