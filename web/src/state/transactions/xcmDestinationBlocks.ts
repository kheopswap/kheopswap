import { range } from "lodash-es";
import type { BlockInfo, HexString } from "polkadot-api";
import {
	catchError,
	concat,
	concatMap,
	defer,
	EMPTY,
	from,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	tap,
	timer,
} from "rxjs";
import { type Api, getApi$ } from "../../papi/getApi";
import { isChainIdHydration } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { logger } from "../../utils/logger";

const BLOCK_STREAM_RETRY_DELAYS_MS = [10_000, 20_000, 40_000, 60_000];

export type DestinationBlock =
	| { type: "block"; events: TxEvents }
	| { type: "unreachable" };

export const getArrivalBufferBlocks = (destination: ChainId) =>
	isChainIdHydration(destination) ? 10 : 30;

export const getXcmBlockEvents = (records: BlockRecords): TxEvents =>
	records
		.filter(({ phase }) => phase.type !== "ApplyExtrinsic")
		.map(({ event }) => event);

const getPastBlockEvents = async (
	api: Api<ChainId>,
	number: number,
	tipHash: HexString,
): Promise<TxEvents> => {
	const hash = await api.query.System.BlockHash.getValue(number, {
		at: tipHash,
	});
	return getXcmBlockEvents(
		await api.query.System.Events.getValue({ at: hash }),
	);
};

type BlockRecords = { phase: { type: string }; event: TxEvents[number] }[];

const getRetryDelayMs = (failures: number) =>
	BLOCK_STREAM_RETRY_DELAYS_MS[
		Math.min(failures, BLOCK_STREAM_RETRY_DELAYS_MS.length) - 1
	] ?? 0;

// watchValue only reports the latest block of its branch, so blocks that pass while a
// query is in flight, or that finalize together, are read back through the tip
const watchBlockEvents$ = (
	chainId: ChainId,
	at: "best" | "finalized",
	bufferBlocks: number,
): Observable<DestinationBlock> => {
	let lastNumber: number | null = null;
	let failures = 0;
	const markRead = (number: number) => {
		lastNumber = number;
		failures = 0;
	};

	const readPastBlock = (
		api: Api<ChainId>,
		number: number,
		tipHash: HexString,
	) =>
		from(getPastBlockEvents(api, number, tipHash)).pipe(
			tap(() => markRead(number)),
			catchError((error) => {
				logger.warn("[xcm arrival] skipping a block that could not be read", {
					chainId,
					at,
					number,
					error,
				});
				markRead(number);
				return EMPTY;
			}),
		);

	const watch = (): Observable<DestinationBlock> =>
		getApi$(chainId).pipe(
			switchMap((api) => {
				const blocks$: Observable<{ block: BlockInfo; value: BlockRecords }> =
					api.query.System.Events.watchValue({ at });
				return blocks$.pipe(
					concatMap(({ block, value }) => {
						const missing =
							lastNumber !== null && block.number > lastNumber
								? range(
										Math.max(lastNumber + 1, block.number - bufferBlocks),
										block.number,
									)
								: [];
						return concat(
							from(missing).pipe(
								concatMap((number) => readPastBlock(api, number, block.hash)),
							),
							of(getXcmBlockEvents(value)).pipe(
								tap(() => markRead(block.number)),
							),
						);
					}),
				);
			}),
			map((events): DestinationBlock => ({ type: "block", events })),
			catchError((error) => {
				failures += 1;
				logger.warn("[xcm arrival] destination unreachable, retrying", {
					chainId,
					at,
					failures,
					error,
				});
				return concat(
					of<DestinationBlock>({ type: "unreachable" }),
					timer(getRetryDelayMs(failures)).pipe(switchMap(watch)),
				);
			}),
		);

	return defer(watch);
};

export const getBlockEvents$ = (chainId: ChainId, at: "best" | "finalized") =>
	getCachedObservable$("xcmBlockEvents$", `${chainId}::${at}`, () =>
		watchBlockEvents$(chainId, at, getArrivalBufferBlocks(chainId)).pipe(
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);
