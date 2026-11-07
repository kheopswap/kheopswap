import { firstValueFrom } from "rxjs";
import { toHex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import { createEthereumTxObservable } from "./createEthereumTxObservable";

vi.mock("../../papi/getApi", () => ({
	getApi: async () => ({ chainId: "pah" }),
}));

vi.mock("../../utils/getBlockDurationMs", () => ({
	getBlockDurationMs: async () => 6_000,
}));

const targetChainId = getChainById("pah").evmChainId;

const wallet = { chainId: targetChainId };

const request = vi.fn(async ({ method }: { method: string }) =>
	method === "eth_chainId" ? toHex(wallet.chainId) : "0xtx",
);

const sentMethods = () => request.mock.calls.map(([{ method }]) => method);

const broadcast = () =>
	firstValueFrom(
		createEthereumTxObservable({
			account: {
				platform: "ethereum",
				address: "0x1111111111111111111111111111111111111111",
				client: { request: request as never },
			},
			chainId: "pah",
			callData: "0xcall",
		}),
	);

beforeEach(() => {
	wallet.chainId = targetChainId;
	request.mockClear();
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
});
