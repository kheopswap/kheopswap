import { firstValueFrom } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import { createEthereumTxObservable } from "./createEthereumTxObservable";

vi.mock("../../papi/getApi", () => ({
	getApi: async () => ({ chainId: "pah" }),
}));

vi.mock("../../utils/getBlockDurationMs", () => ({
	getBlockDurationMs: async () => 6_000,
}));

describe("createEthereumTxObservable", () => {
	it("sends the transaction with the target chain id", async () => {
		const request = vi.fn(async () => "0xtx");

		const broadcasted = await firstValueFrom(
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

		expect(broadcasted).toEqual({ type: "broadcasted", txHash: "0xtx" });
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
});
