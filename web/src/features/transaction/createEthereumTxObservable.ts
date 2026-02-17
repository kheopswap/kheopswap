import type { ChainId } from "@kheopswap/registry";
import { logger, sleep } from "@kheopswap/utils";
import type { PolkadotClient, TxEvent } from "polkadot-api";
import { filter, firstValueFrom, Observable } from "rxjs";

const RUNTIME_PALLETS_ADDR = "0x6d6f646c70792f70616464720000000000000000";

export type EthereumWalletClient = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type EthereumTransactionReceipt = {
	status?: `0x${string}`;
	blockHash?: `0x${string}`;
	blockNumber?: `0x${string}`;
	transactionIndex?: `0x${string}`;
};

type SystemEvent = {
	phase: { type: string; value?: number };
	event: { type: string; value: { type: string; value: unknown } };
	topics: unknown[];
};

const waitForReceipt = async (
	client: EthereumWalletClient,
	txHash: `0x${string}`,
): Promise<EthereumTransactionReceipt> => {
	for (let attempt = 0; attempt < 120; attempt++) {
		const receipt = (await client.request({
			method: "eth_getTransactionReceipt",
			params: [txHash],
		})) as EthereumTransactionReceipt | null;

		if (receipt) return receipt;
		await sleep(1000);
	}

	throw new Error("Timed out while waiting for Ethereum transaction receipt");
};

/**
 * Fetches decoded Substrate events for a specific extrinsic from a block.
 *
 * Uses PAPI's UnsafeApi to query System.Events at the given block hash,
 * then filters by extrinsic index — the same logic PAPI's submit$ uses internally.
 */
const fetchBlockEvents = async (
	client: PolkadotClient,
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
	const unsafeApi = client.getUnsafeApi();
	// biome-ignore lint/style/noNonNullAssertion: System.Events always exists on Substrate chains
	const systemEvents = (await unsafeApi.query.System!.Events!.getValue({
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

/**
 * Creates an Observable<TxEvent> for Ethereum transactions that provides
 * the same event flow as PAPI's signSubmitAndWatch:
 *
 * 1. { type: "broadcasted" }       — when eth_sendTransaction returns a tx hash
 * 2. { type: "txBestBlocksState" } — when the tx is found in a best block,
 *    with decoded Substrate events (SwapExecuted, TransactionFeePaid, etc.)
 * 3. { type: "finalized" }         — when the block is finalized
 *
 * Before querying System.Events, we wait for PAPI's chain head to be aware of
 * the block and pin it to prevent unpinning during the query.
 *
 * Errors (user rejection, timeout) go through the Observable error channel.
 */
export const createEthereumTxObservable = ({
	walletClient,
	from,
	callData,
	chainId,
	getClient,
}: {
	walletClient: EthereumWalletClient;
	from: string;
	callData: string;
	chainId: ChainId;
	getClient: () => Promise<PolkadotClient>;
}): Observable<TxEvent> =>
	new Observable((subscriber) => {
		let cancelled = false;
		let releaseBlock: (() => void) | undefined;

		const run = async () => {
			const txHash = (await walletClient.request({
				method: "eth_sendTransaction",
				params: [
					{
						from,
						to: RUNTIME_PALLETS_ADDR,
						data: callData,
						value: "0x0",
					},
				],
			})) as `0x${string}`;

			if (cancelled) return;

			subscriber.next({ type: "broadcasted", txHash });

			// Start getting PAPI client in parallel with receipt polling
			const [receipt, client] = await Promise.all([
				waitForReceipt(walletClient, txHash),
				getClient(),
			]);

			if (cancelled) return;

			const blockHash = receipt.blockHash ?? txHash;
			const blockNumber = Number.parseInt(receipt.blockNumber ?? "0x0", 16);
			const txIndex = Number.parseInt(receipt.transactionIndex ?? "0x0", 16);

			// Wait for PAPI's chain head to be aware of blocks at our height.
			// This ensures the block is pinned before we try to query it.
			await firstValueFrom(
				client.bestBlocks$.pipe(
					filter((blocks) => (blocks[0]?.number ?? 0) >= blockNumber),
				),
			);

			if (cancelled) return;

			// Pin the block to prevent PAPI from unpinning it during our event query
			try {
				releaseBlock = client.hodlBlock(blockHash);
			} catch {
				logger.warn("[eth-tx] Could not pin block, it may have been pruned", {
					chainId,
					blockHash,
				});
			}

			// Fetch decoded Substrate events from the block
			let blockEvents: Awaited<ReturnType<typeof fetchBlockEvents>>;
			try {
				blockEvents = await fetchBlockEvents(client, blockHash, txIndex);
			} catch (err) {
				logger.warn(
					"[eth-tx] Failed to fetch block events, proceeding without them",
					{ chainId, blockHash, txIndex, err },
				);
				const ok = receipt.status === "0x1" || receipt.status === "0x01";
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

			if (cancelled) return;

			const block = {
				hash: blockHash,
				number: blockNumber,
				index: txIndex,
			};

			// Emit txBestBlocksState — the tx has been found in a best block
			subscriber.next({
				type: "txBestBlocksState",
				txHash,
				found: true,
				...blockEvents,
				block,
			} as TxEvent);

			// Wait for PAPI to finalize the block
			await firstValueFrom(
				client.finalizedBlock$.pipe(filter((b) => b.number >= blockNumber)),
			);

			if (cancelled) return;

			// Emit finalized
			subscriber.next({
				type: "finalized",
				txHash,
				...blockEvents,
				block,
			} as TxEvent);

			subscriber.complete();
		};

		run().catch((error) => {
			if (!cancelled) subscriber.error(error);
		});

		return () => {
			cancelled = true;
			releaseBlock?.();
		};
	});
