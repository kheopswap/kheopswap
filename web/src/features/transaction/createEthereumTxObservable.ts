import type { TxEvent } from "polkadot-api";
import { Observable } from "rxjs";
import type { Address, Client, Hex, PublicClient } from "viem";
import { createPublicClient, fallback, http } from "viem";
import { type Api, getApi } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { getBlockDurationMs } from "../../utils/getBlockDurationMs";
import { logger } from "../../utils/logger";
import { sleep } from "../../utils/sleep";

/**
 * H160 (Ethereum) address of the Revive pallet's "runtime pallets" dispatch precompile on Asset Hub.
 *
 * When an Ethereum transaction is sent `to` this address with encoded Substrate call data,
 * the Revive pallet decodes and dispatches it as a native Substrate extrinsic.
 *
 * The hex decodes to ASCII `modlpy/paddr` (the well-known Substrate module account prefix
 * for the `py/paddr` module), null-padded to 20 bytes.
 */
const RUNTIME_PALLETS_ADDR = "0x6d6f646c70792f70616464720000000000000000";
const ZERO_HASH =
	"0x0000000000000000000000000000000000000000000000000000000000000000";

const BLOCK_HASH_POLL_INTERVAL_MS = 500;
const FINALIZATION_POLL_INTERVAL_MS = 1000;

/**
 * Computes timeouts for each phase of the Ethereum→Substrate transaction tracking
 * pipeline, scaled from the chain's expected block duration.
 *
 * - Receipt:       ~20 blocks — enough time for the Ethereum RPC to index the receipt.
 * - Block hash:    ~10 blocks — time for the Substrate RPC to sync to the block.
 * - Finalization:  ~20 blocks — time for the block to be finalized on the relay chain.
 */
const getTimeouts = (blockDurationMs: number) => ({
	receiptMs: blockDurationMs * 20,
	blockHashMs: blockDurationMs * 10,
	finalizationMs: blockDurationMs * 20,
});

export type EthereumWalletClient = Pick<Client, "request">;
export type EthereumAccount = {
	platform: "ethereum";
	address: string;
	client: EthereumWalletClient;
};

type SystemEvent = {
	phase: { type: string; value?: number };
	event: { type: string; value: { type: string; value: unknown } };
	topics: unknown[];
};

const parseNumberLike = (value: unknown, fallback: number): number => {
	if (typeof value === "number")
		return Number.isFinite(value) ? value : fallback;
	if (typeof value === "bigint") return Number(value);
	if (typeof value === "string") {
		const radix = value.startsWith("0x") ? 16 : 10;
		const parsed = Number.parseInt(value, radix);
		return Number.isFinite(parsed) ? parsed : fallback;
	}
	return fallback;
};

const isReceiptSuccess = (status: unknown): boolean =>
	status === "success" || status === "0x1" || status === "0x01";

const createEthereumPublicClient = (
	rpcUrls: string[],
	chainId: ChainId,
): PublicClient => {
	const urls = rpcUrls.filter(Boolean);
	if (!urls.length) {
		throw new Error(`No public Ethereum RPC configured for chain ${chainId}`);
	}

	const transport =
		urls.length === 1
			? http(urls[0], { retryCount: 0 })
			: fallback(
					urls.map((url) => http(url, { retryCount: 0 })),
					{ rank: false },
				);

	return createPublicClient({ transport });
};

const waitForReceipt = async (
	publicClient: PublicClient,
	txHash: Hex,
	timeoutMs: number,
	signal?: AbortSignal,
) => {
	let delay = 1000;
	const maxDelay = 5000;
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (signal?.aborted) throw new Error("Transaction was cancelled");

		try {
			const receipt = await publicClient.getTransactionReceipt({
				hash: txHash,
			});
			if (receipt) return receipt;
		} catch (err) {
			void err;
		}

		await sleep(delay);
		delay = Math.min(delay * 1.5, maxDelay);
	}

	throw new Error("Timed out while waiting for Ethereum transaction receipt");
};

const waitForSubstrateBlockHash = async (
	api: Api<ChainId>,
	blockNumber: number,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<string> => {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (signal?.aborted) throw new Error("Transaction was cancelled");

		try {
			const blockHashValue = await api.query.System.BlockHash.getValue(
				blockNumber,
				{
					at: "best",
					signal,
				},
			);
			const hash = blockHashValue;

			if (hash && hash !== ZERO_HASH) return hash;
		} catch (err) {
			void err;
		}

		await sleep(BLOCK_HASH_POLL_INTERVAL_MS);
	}

	throw new Error(
		`Timed out while resolving Substrate block hash for block ${blockNumber}`,
	);
};

const waitForFinalization = async (
	api: Api<ChainId>,
	blockNumber: number,
	expectedHash: string,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<string> => {
	const deadline = Date.now() + timeoutMs;
	let attempts = 0;

	while (Date.now() < deadline) {
		if (signal?.aborted) throw new Error("Transaction was cancelled");
		attempts += 1;

		try {
			const finalizedHashValue = await api.query.System.BlockHash.getValue(
				blockNumber,
				{ at: "finalized", signal },
			);
			const finalizedHash = finalizedHashValue;

			if (finalizedHash && finalizedHash !== ZERO_HASH) {
				if (finalizedHash !== expectedHash) {
					logger.warn("[eth-tx] Finalized block hash differs from best hash", {
						chainId: api.chainId,
						blockNumber,
						expectedHash,
						finalizedHash,
						attempts,
					});
				}

				return finalizedHash;
			}
		} catch (err) {
			void err;
		}

		await sleep(FINALIZATION_POLL_INTERVAL_MS);
	}

	throw new Error(
		`Timed out while waiting for finalization for block ${blockNumber}`,
	);
};

const fetchBlockEvents = async (
	api: Api<ChainId>,
	blockHash: string,
	extrinsicIndex: number,
): Promise<
	| {
			ok: true;
			events: Array<{ type: string; value: unknown; topics: unknown[] }>;
	  }
	| {
			ok: false;
			events: Array<{ type: string; value: unknown; topics: unknown[] }>;
			dispatchError: { type: string; value: unknown };
	  }
> => {
	const systemEvents = (await api.query.System.Events.getValue({
		at: blockHash,
	})) as SystemEvent[];

	const events = systemEvents
		.filter(
			(x) =>
				x.phase.type === "ApplyExtrinsic" && x.phase.value === extrinsicIndex,
		)
		.map((x) => ({ ...x.event, topics: x.topics }));

	if (!events.length) return { ok: true, events };

	const lastEvent = events[events.length - 1];
	if (
		lastEvent &&
		lastEvent.type === "System" &&
		(lastEvent.value as { type: string }).type === "ExtrinsicFailed"
	) {
		return {
			ok: false,
			events,
			dispatchError: (
				lastEvent.value as {
					value: { dispatch_error: { type: string; value: unknown } };
				}
			).value.dispatch_error,
		};
	}

	return { ok: true, events };
};

export const createEthereumTxObservable = ({
	account,
	chainId,
	callData,
}: {
	account: EthereumAccount;
	chainId: ChainId;
	callData: Hex;
}): Observable<TxEvent> =>
	new Observable((subscriber) => {
		const abortController = new AbortController();

		const run = async () => {
			const api = await getApi(chainId);
			const chain = getChainById(chainId);
			const blockDurationMs = await getBlockDurationMs(api);
			const timeouts = getTimeouts(blockDurationMs);
			const publicRpcUrls = chain?.evmRpcUrl ?? [];
			const from = account.address as Address;

			const publicClient = createEthereumPublicClient(
				publicRpcUrls,
				api.chainId,
			);

			const txHash = (await account.client.request({
				method: "eth_sendTransaction",
				params: [
					{
						from,
						to: RUNTIME_PALLETS_ADDR as Address,
						data: callData,
						value: "0x0",
					},
				],
			})) as Hex;

			subscriber.next({ type: "broadcasted", txHash });

			const receipt = await waitForReceipt(
				publicClient,
				txHash,
				timeouts.receiptMs,
				abortController.signal,
			);
			if (abortController.signal.aborted) return;

			const blockNumber = parseNumberLike(receipt.blockNumber, 0);
			const txIndex = parseNumberLike(receipt.transactionIndex, 0);

			const substrateBlockHash = await waitForSubstrateBlockHash(
				api,
				blockNumber,
				timeouts.blockHashMs,
				abortController.signal,
			);

			if (abortController.signal.aborted) return;

			let blockEvents: Awaited<ReturnType<typeof fetchBlockEvents>>;
			try {
				blockEvents = await fetchBlockEvents(api, substrateBlockHash, txIndex);
			} catch (err) {
				logger.warn(
					"[eth-tx] Failed to fetch block events, proceeding without them",
					{
						chainId: api.chainId,
						txHash,
						err,
					},
				);
				const ok = isReceiptSuccess(receipt.status);
				blockEvents = ok
					? { ok: true, events: [] }
					: {
							ok: false,
							events: [],
							dispatchError: {
								type: "Ethereum",
								value: "Transaction reverted",
							},
						};
			}

			if (abortController.signal.aborted) return;

			const block = {
				hash: substrateBlockHash,
				number: blockNumber,
				index: txIndex,
			};

			subscriber.next({
				type: "txBestBlocksState",
				txHash,
				found: true,
				...blockEvents,
				block,
			} as TxEvent);

			const finalizedHash = await waitForFinalization(
				api,
				blockNumber,
				substrateBlockHash,
				timeouts.finalizationMs,
				abortController.signal,
			);

			if (abortController.signal.aborted) return;

			if (finalizedHash !== block.hash) block.hash = finalizedHash;

			subscriber.next({
				type: "finalized",
				txHash,
				...blockEvents,
				block,
			} as TxEvent);

			subscriber.complete();
		};

		run().catch((error) => {
			if (!abortController.signal.aborted) subscriber.error(error);
		});

		return () => {
			abortController.abort();
		};
	});
