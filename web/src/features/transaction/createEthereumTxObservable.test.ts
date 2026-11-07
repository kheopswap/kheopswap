import type { TxEvent } from "polkadot-api";
import { firstValueFrom } from "rxjs";
import { toHex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import { createEthereumTxObservable } from "./createEthereumTxObservable";

vi.mock("../../papi/getApi", () => ({
	getApi: async () => ({ chainId: "pah" }),
}));

vi.mock("../../utils/getBlockDurationMs", () => ({
	getBlockDurationMs: async () => 6_000,
}));

const receipts = vi.hoisted(() => ({
	getTransactionReceipt: vi.fn(async () => null),
}));

vi.mock("viem", async (importOriginal) => ({
	...(await importOriginal<typeof import("viem")>()),
	createPublicClient: () => receipts,
}));

const targetChainId = getChainById("pah").evmChainId;

const wallet = { chainId: targetChainId };

const request = vi.fn(async ({ method }: { method: string }) =>
	method === "eth_chainId" ? toHex(wallet.chainId) : "0xtx",
);

const sentMethods = () => request.mock.calls.map(([{ method }]) => method);

const txEvents$ = () =>
	createEthereumTxObservable({
		account: {
			platform: "ethereum",
			address: "0x1111111111111111111111111111111111111111",
			client: { request: request as never },
		},
		chainId: "pah",
		callData: "0xcall",
	});

const broadcast = () => firstValueFrom(txEvents$());

beforeEach(() => {
	wallet.chainId = targetChainId;
	request.mockClear();
	receipts.getTransactionReceipt.mockClear();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createEthereumTxObservable", () => {
	it("sends the transaction with the target chain id", async () => {
		expect(await broadcast()).toEqual({ type: "broadcasted", txHash: "0xtx" });
		expect(request).toHaveBeenCalledWith({
			method: "eth_sendTransaction",
			params: [
				expect.objectContaining({
					chainId: toHex(targetChainId),
					data: "0xcall",
				}),
			],
		});
	});

	it("does not send while the wallet is on another chain", async () => {
		wallet.chainId = 1;
		await expect(broadcast()).rejects.toThrow("Wrong network");
		expect(sentMethods()).toEqual(["eth_chainId"]);
	});

	it("keeps polling for a receipt long after the receipt window", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const events: TxEvent[] = [];
		let failure: unknown;
		const subscription = txEvents$().subscribe({
			next: (event) => events.push(event),
			error: (error) => {
				failure = error;
			},
		});

		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(events.map(({ type }) => type)).toEqual(["broadcasted"]);
		expect(failure).toBeUndefined();

		const polls = receipts.getTransactionReceipt.mock.calls.length;
		await vi.advanceTimersByTimeAsync(60_000);
		expect(receipts.getTransactionReceipt.mock.calls.length).toBeGreaterThan(
			polls,
		);
		subscription.unsubscribe();
	});
});
