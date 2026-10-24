import type { TxEvent } from "polkadot-api";
import { Observable } from "rxjs";
import type { Address, Client, Hex, PublicClient } from "viem";
import { createPublicClient, fallback, http, toHex } from "viem";
import { type Api, getApi } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import { getBlockDurationMs } from "../../utils/getBlockDurationMs";
import { logger } from "../../utils/logger";
import { sleep } from "../../utils/sleep";

// Revive dispatches the call data of an Ethereum transaction sent to this address as a
// Substrate extrinsic. The hex spells the module account prefix `modlpy/paddr`.
const RUNTIME_PALLETS_ADDR: Address =
	"0x6d6f646c70792f70616464720000000000000000";
const ZERO_HASH =
	"0x0000000000000000000000000000000000000000000000000000000000000000";

const BLOCK_HASH_POLL_INTERVAL_MS = 500;
const FINALIZATION_POLL_INTERVAL_MS = 1000;

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

type BlockInclusion = { hash: string; number: number; index: number };

type FinalizedInclusion = BlockInclusion & { isReceiptSuccess: boolean };

type ExtrinsicEvents = Extract<TxEvent, { type: "finalized" }>;

const isSameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const createEthereumPublicClient = (
	rpcUrls: string[],
	chainId: ChainIdAssetHub,
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
	signal: AbortSignal,
) => {
	let delay = 1000;
	const maxDelay = 5000;
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (signal.aborted) throw new Error("Transaction was cancelled");

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

const getBlockHash = async (
	api: Api<ChainIdAssetHub>,
	blockNumber: number,
	at: "best" | "finalized",
	signal: AbortSignal,
): Promise<string | null> => {
	try {
		const hash = await api.query.System.BlockHash.getValue(blockNumber, {
			at,
			signal,
		});
		return hash && hash !== ZERO_HASH ? hash : null;
	} catch {
		return null;
	}
};

const waitForBlockHash = async (
	api: Api<ChainIdAssetHub>,
	blockNumber: number,
	at: "best" | "finalized",
	timeoutMs: number,
	signal: AbortSignal,
): Promise<string> => {
	const deadline = Date.now() + timeoutMs;
	const interval =
		at === "best" ? BLOCK_HASH_POLL_INTERVAL_MS : FINALIZATION_POLL_INTERVAL_MS;

	while (Date.now() < deadline) {
		if (signal.aborted) throw new Error("Transaction was cancelled");

		const hash = await getBlockHash(api, blockNumber, at, signal);
		if (hash) return hash;

		await sleep(interval);
	}

	throw new Error(
		`Timed out while waiting for the ${at} hash of block ${blockNumber}`,
	);
};

// the Ethereum RPC indexes receipts by Substrate block hash, so a receipt whose block
// is the finalized block at its height proves the transaction is in it
const waitForFinalizedInclusion = async (
	api: Api<ChainIdAssetHub>,
	publicClient: PublicClient,
	txHash: Hex,
	timeoutMs: number,
	signal: AbortSignal,
): Promise<FinalizedInclusion> => {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (signal.aborted) throw new Error("Transaction was cancelled");

		const receipt = await waitForReceipt(
			publicClient,
			txHash,
			timeoutMs,
			signal,
		);
		const number = Number(receipt.blockNumber);
		const finalizedHash = await getBlockHash(api, number, "finalized", signal);
		if (finalizedHash && isSameHex(finalizedHash, receipt.blockHash))
			return {
				hash: finalizedHash,
				number,
				index: receipt.transactionIndex,
				isReceiptSuccess: receipt.status === "success",
			};

		await sleep(FINALIZATION_POLL_INTERVAL_MS);
	}

	throw new Error("Transaction was not found in a finalized block");
};

const fetchExtrinsicEvents = async (
	api: Api<ChainIdAssetHub>,
	block: BlockInclusion,
	txHash: Hex,
): Promise<ExtrinsicEvents> => {
	const systemEvents = await api.query.System.Events.getValue({
		at: block.hash,
	});

	const events = systemEvents
		.filter(
			({ phase }) =>
				phase.type === "ApplyExtrinsic" && phase.value === block.index,
		)
		.map((record) => ({ ...record, ...record.event }));

	const lastEvent = events.at(-1)?.event;
	if (
		lastEvent?.type === "System" &&
		lastEvent.value.type === "ExtrinsicFailed"
	)
		return {
			type: "finalized",
			txHash,
			ok: false,
			events,
			block,
			dispatchError: lastEvent.value.value.dispatch_error,
		};

	return { type: "finalized", txHash, ok: true, events, block };
};

const getExtrinsicEvents = async (
	api: Api<ChainIdAssetHub>,
	block: BlockInclusion,
	txHash: Hex,
	isReceiptSuccess: boolean,
): Promise<ExtrinsicEvents> => {
	try {
		return await fetchExtrinsicEvents(api, block, txHash);
	} catch (err) {
		logger.warn(
			"[eth-tx] Failed to fetch block events, proceeding without them",
			{
				chainId: api.chainId,
				txHash,
				err,
			},
		);
		return isReceiptSuccess
			? { type: "finalized", txHash, ok: true, events: [], block }
			: {
					type: "finalized",
					txHash,
					ok: false,
					events: [],
					block,
					dispatchError: { type: "Ethereum", value: "Transaction reverted" },
				};
	}
};

export const createEthereumTxObservable = ({
	account,
	chainId,
	callData,
}: {
	account: EthereumAccount;
	chainId: ChainIdAssetHub;
	callData: Hex;
}): Observable<TxEvent> =>
	new Observable((subscriber) => {
		const abortController = new AbortController();
		const { signal } = abortController;

		const run = async () => {
			const api = await getApi(chainId);
			const chain = getChainById(chainId);
			const timeouts = getTimeouts(await getBlockDurationMs(api));
			const publicClient = createEthereumPublicClient(
				chain.evmRpcUrl,
				api.chainId,
			);

			const txHash = await account.client.request({
				method: "eth_sendTransaction",
				params: [
					{
						from: account.address as Address,
						to: RUNTIME_PALLETS_ADDR,
						data: callData,
						value: "0x0",
						chainId: toHex(chain.evmChainId),
					},
				],
			});

			subscriber.next({ type: "broadcasted", txHash });

			const receipt = await waitForReceipt(
				publicClient,
				txHash,
				timeouts.receiptMs,
				signal,
			);
			const bestBlock: BlockInclusion = {
				number: Number(receipt.blockNumber),
				index: receipt.transactionIndex,
				hash: await waitForBlockHash(
					api,
					Number(receipt.blockNumber),
					"best",
					timeouts.blockHashMs,
					signal,
				),
			};
			const isReceiptSuccess = receipt.status === "success";
			const bestEvents = await getExtrinsicEvents(
				api,
				bestBlock,
				txHash,
				isReceiptSuccess,
			);
			if (signal.aborted) return;

			subscriber.next({ ...bestEvents, type: "inBestBlock" });

			const finalizedHash = await waitForBlockHash(
				api,
				bestBlock.number,
				"finalized",
				timeouts.finalizationMs,
				signal,
			);
			if (signal.aborted) return;

			// the receipt and the best hash were read separately, so a reorg between the
			// two reads can pair the receipt's index with another block's extrinsic
			const isStillAtBestInclusion = async () => {
				if (!isSameHex(finalizedHash, bestBlock.hash)) return false;
				const receiptNow = await waitForReceipt(
					publicClient,
					txHash,
					timeouts.receiptMs,
					signal,
				);
				return (
					Number(receiptNow.blockNumber) === bestBlock.number &&
					receiptNow.transactionIndex === bestBlock.index
				);
			};

			if (await isStillAtBestInclusion()) {
				subscriber.next(bestEvents);
			} else {
				logger.warn(
					"[eth-tx] Finalized inclusion differs from the best block",
					{
						chainId: api.chainId,
						txHash,
						bestHash: bestBlock.hash,
						finalizedHash,
					},
				);
				const {
					isReceiptSuccess: isCanonicalReceiptSuccess,
					...finalizedBlock
				} = await waitForFinalizedInclusion(
					api,
					publicClient,
					txHash,
					timeouts.finalizationMs,
					signal,
				);
				const finalizedEvents = await getExtrinsicEvents(
					api,
					finalizedBlock,
					txHash,
					isCanonicalReceiptSuccess,
				);
				if (signal.aborted) return;
				subscriber.next(finalizedEvents);
			}

			subscriber.complete();
		};

		run().catch((error) => {
			if (!signal.aborted) subscriber.error(error);
		});

		return () => {
			abortController.abort();
		};
	});
