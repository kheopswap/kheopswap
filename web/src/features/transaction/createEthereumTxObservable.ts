import type { ChainId } from "@kheopswap/registry";
import { logger, sleep } from "@kheopswap/utils";
import type { PolkadotClient, TxEvent } from "polkadot-api";
import type { Subscription } from "rxjs";
import {
	filter,
	firstValueFrom,
	map,
	merge,
	Observable,
	switchMap,
} from "rxjs";

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
 * The Ethereum receipt provides a keccak256 block hash, but PAPI uses blake2b-256
 * Substrate hashes. We resolve the Substrate hash by block number using two
 * strategies raced together:
 * - blocks$ / bestBlocks$: captures blocks as the light client reports them
 * - System.BlockHash storage query: fallback when the light client is slow and
 *   finalization jumps past our block (so it never appears in bestBlocks$)
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
		const heldBlocks: Array<() => void> = [];
		let blocksSub: Subscription | undefined;

		const run = async () => {
			// Get PAPI client BEFORE sending the tx so we can subscribe to blocks$
			// and capture Substrate block hashes before our block is produced.
			const client = await getClient();

			if (cancelled) return;

			// Watch blocks as PAPI discovers them, recording Substrate hashes by
			// number. We hodl each block to prevent PAPI from unpinning it before
			// we can query its events. This runs from tx send to finalization
			// (~10-30 blocks), so the held set stays small.
			// blocks$ replays finalized + descendants synchronously on subscribe.
			const blocksByNumber = new Map<number, string>();
			blocksSub = client.blocks$.subscribe((block) => {
				blocksByNumber.set(block.number, block.hash);
				try {
					heldBlocks.push(client.hodlBlock(block.hash));
				} catch {
					// Block might have been unpinned already — still record the hash
				}
			});

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

			const receipt = await waitForReceipt(walletClient, txHash);

			if (cancelled) return;

			const blockNumber = Number.parseInt(receipt.blockNumber ?? "0x0", 16);
			const txIndex = Number.parseInt(receipt.transactionIndex ?? "0x0", 16);

			// Resolve the Substrate block hash from the block number.
			// The Ethereum receipt gives a keccak256 hash that PAPI cannot use;
			// we look up the blake2b-256 Substrate hash by number instead.
			let substrateBlockHash = blocksByNumber.get(blockNumber);

			if (!substrateBlockHash) {
				// Block not yet captured by blocks$ — race two strategies:
				// 1. bestBlocks$: works when the light client is keeping up and
				//    the block appears as unfinalized or latest-finalized.
				// 2. finalizedBlock$ → System.BlockHash: works when the light
				//    client is slow and finalization jumps past our block
				//    (so it never individually appears in bestBlocks$).
				substrateBlockHash = await firstValueFrom(
					merge(
						client.bestBlocks$.pipe(
							map(
								(blocks) => blocks.find((b) => b.number === blockNumber)?.hash,
							),
							filter((hash): hash is string => !!hash),
						),
						client.finalizedBlock$.pipe(
							filter((b) => b.number > blockNumber),
							switchMap(async () => {
								const unsafeApi = client.getUnsafeApi();
								// System.BlockHash stores hashes for the last 256 blocks
								// biome-ignore lint/style/noNonNullAssertion: System.BlockHash always exists
								const hash = (await unsafeApi.query.System!.BlockHash!.getValue(
									blockNumber,
								)) as string;
								return hash;
							}),
							filter(
								(hash): hash is string =>
									!!hash &&
									hash !==
										"0x0000000000000000000000000000000000000000000000000000000000000000",
							),
						),
					),
				);

				// Hodl it if possible — may fail for already-finalized blocks
				try {
					heldBlocks.push(client.hodlBlock(substrateBlockHash));
				} catch {
					logger.warn("[eth-tx] Could not pin block, it may have been pruned", {
						chainId,
						substrateBlockHash,
					});
				}
			}

			if (cancelled) return;

			// Fetch decoded Substrate events from the block
			let blockEvents: Awaited<ReturnType<typeof fetchBlockEvents>>;
			try {
				blockEvents = await fetchBlockEvents(
					client,
					substrateBlockHash,
					txIndex,
				);
			} catch (err) {
				logger.warn(
					"[eth-tx] Failed to fetch block events, proceeding without them",
					{ chainId, blockHash: substrateBlockHash, txIndex, err },
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
				hash: substrateBlockHash,
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
			blocksSub?.unsubscribe();
			for (const release of heldBlocks) release();
		};
	});
