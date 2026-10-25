import { findLast, isEqual, omit, range } from "lodash-es";
import type { BlockInfo, HexString } from "polkadot-api";
import {
	BehaviorSubject,
	catchError,
	combineLatest,
	concat,
	concatMap,
	defer,
	distinctUntilChanged,
	EMPTY,
	filter,
	from,
	map,
	mergeMap,
	type Observable,
	of,
	scan,
	shareReplay,
	startWith,
	switchMap,
	take,
	takeUntil,
	takeWhile,
	tap,
	timer,
} from "rxjs";
import { type Api, getApi$ } from "../../papi/getApi";
import { getChainById, isChainIdHydration } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { TokenAmount, TokenId } from "../../registry/tokens/types";
import { bindSerialized } from "../../utils/bindSerialized";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { logger } from "../../utils/logger";
import {
	getXcmDepositMatcher,
	type XcmDepositTarget,
} from "../../utils/xcmDeposit";
import { transactions$ } from "./transactionStore";
import type {
	TransactionId,
	TransactionRecord,
	TransactionType,
} from "./types";

const ARRIVAL_TIMEOUT_MS = 10 * 60_000;
const BLOCK_STREAM_RETRY_DELAYS_MS = [10_000, 20_000, 40_000, 60_000];

const XCM_ARRIVAL_TYPES = [
	"xcmTransfer",
	"xcmSwap",
	"xcmDestinationSwap",
] as const satisfies readonly TransactionType[];

export type XcmArrivalType = (typeof XCM_ARRIVAL_TYPES)[number];

export const isXcmArrivalType = (
	type: TransactionType,
): type is XcmArrivalType =>
	XCM_ARRIVAL_TYPES.some((arrivalType) => arrivalType === type);

export type XcmArrivalRecord = Extract<
	TransactionRecord,
	{ type: XcmArrivalType }
>;

export const isXcmArrivalRecord = (
	record: TransactionRecord,
): record is XcmArrivalRecord => isXcmArrivalType(record.type);

type FailedArrival = { returned: TokenAmount[]; trapped: boolean };

export type XcmArrival =
	| { status: "awaiting-origin" }
	| { status: "origin-failed" }
	| { status: "in-transit"; messageId: HexString }
	| {
			status: "arrived";
			messageId: HexString;
			received: bigint | null;
			finalized: boolean;
	  }
	| ({
			status: "failed-on-destination";
			messageId: HexString;
			finalized: boolean;
	  } & FailedArrival)
	| { status: "unreachable"; messageId: HexString }
	| { status: "unconfirmed"; messageId: HexString | null };

export type SentMessage = { messageId: HexString; finalized: boolean };

type OriginState =
	| { status: "pending" }
	| { status: "failed" }
	| { status: "finalized-without-message" }
	| ({ status: "sent" } & SentMessage);

const isSameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const findSentMessageId = (
	events: TxEvents,
	destinationParaId: number,
): HexString | null => {
	for (const { type, value } of events) {
		if (type !== "PolkadotXcm" || value.type !== "Sent") continue;
		const { destination, message_id } = value.value;
		if (
			destination.parents === 1 &&
			destination.interior.type === "X1" &&
			destination.interior.value.type === "Parachain" &&
			destination.interior.value.value === destinationParaId
		)
			return message_id;
	}
	return null;
};

export const getSentMessage = (
	txEvents: TransactionRecord["txEvents"],
	destinationParaId: number,
): SentMessage | null => {
	let bestBlockMessageId: HexString | null = null;
	for (const txEvent of txEvents) {
		switch (txEvent.type) {
			case "finalized": {
				const messageId = findSentMessageId(txEvent.events, destinationParaId);
				return messageId ? { messageId, finalized: true } : null;
			}
			case "inBestBlock":
				bestBlockMessageId = findSentMessageId(
					txEvent.events,
					destinationParaId,
				);
				break;
			case "notInBestBlock":
				bestBlockMessageId = null;
				break;
			default:
				break;
		}
	}
	return bestBlockMessageId
		? { messageId: bestBlockMessageId, finalized: false }
		: null;
};

type ArrivalOutcome =
	| { success: true; received: bigint | null }
	| ({ success: false } & FailedArrival);

const sumDeposits = (events: TxEvents, target: XcmDepositTarget) => {
	const getDeposit = getXcmDepositMatcher(target);
	return events.reduce((sum, event) => sum + getDeposit(event), 0n);
};

const isAssetsTrapped = ({ type, value }: TxEvents[number]) =>
	type === "PolkadotXcm" && value.type === "AssetsTrapped";

export const findArrival = (
	blockEvents: TxEvents,
	{
		messageId,
		target,
		returnTokenIds,
	}: {
		messageId: HexString;
		target: XcmDepositTarget;
		returnTokenIds: TokenId[];
	},
): ArrivalOutcome | null => {
	let messageStart = 0;

	for (const [index, { type, value }] of blockEvents.entries()) {
		if (
			type !== "MessageQueue" ||
			(value.type !== "Processed" && value.type !== "ProcessingFailed")
		)
			continue;

		if (!isSameHex(value.value.id, messageId)) {
			messageStart = index + 1;
			continue;
		}

		const messageEvents = blockEvents.slice(messageStart, index);
		if (value.type === "Processed" && value.value.success)
			return {
				success: true,
				received: sumDeposits(messageEvents, target) || null,
			};

		return {
			success: false,
			returned: returnTokenIds.flatMap((tokenId) => {
				const plancks = sumDeposits(messageEvents, {
					tokenId,
					beneficiary: target.beneficiary,
				});
				return plancks ? [{ tokenId, plancks }] : [];
			}),
			trapped: messageEvents.some(isAssetsTrapped),
		};
	}

	return null;
};

export const describeFailedArrival = ({ returned, trapped }: FailedArrival) => {
	if (trapped)
		return returned.length ? "some assets trapped" : "assets trapped";
	return returned.length ? "funds returned" : null;
};

export type XcmArrivalOutcome = {
	kind: "loading" | "success" | "error" | "warning";
	text: string;
	final: boolean;
};

// null while the origin is not finalized and the destination has not reported
// anything, so the origin headline applies
export const getXcmArrivalOutcome = (
	{ status, followUpData: { target } }: XcmArrivalRecord,
	arrival: XcmArrival | null,
): XcmArrivalOutcome | null => {
	const destination = getChainById(parseTokenId(target.tokenId).chainId).name;
	const isOriginFinalized = status === "finalized";

	switch (arrival?.status) {
		case "arrived": {
			const final = arrival.finalized && isOriginFinalized;
			return {
				kind: "success",
				text: final
					? `Arrived on ${destination}`
					: `Arrived on ${destination}, awaiting finalization`,
				final,
			};
		}
		case "failed-on-destination":
			return {
				kind: "error",
				text: [`Failed on ${destination}`, describeFailedArrival(arrival)]
					.filter(Boolean)
					.join(", "),
				final: arrival.finalized && isOriginFinalized,
			};
		case "unconfirmed":
			return isOriginFinalized
				? {
						kind: "warning",
						text: `Arrival on ${destination} not confirmed`,
						final: true,
					}
				: null;
		case "unreachable":
			return isOriginFinalized
				? {
						kind: "loading",
						text: "Destination unreachable, retrying",
						final: false,
					}
				: null;
		default:
			return isOriginFinalized
				? {
						kind: "loading",
						text: `Sent, awaiting ${destination}...`,
						final: false,
					}
				: null;
	}
};

const getOriginState = (
	record: TransactionRecord,
	destinationParaId: number,
): OriginState => {
	const sent = getSentMessage(record.txEvents, destinationParaId);
	if (sent) return { status: "sent", ...sent };
	if (record.status === "finalized")
		return { status: "finalized-without-message" };
	if (record.status !== "failed") return { status: "pending" };
	const lastInclusion = findLast(
		record.txEvents,
		({ type }) =>
			type !== "pending" && type !== "created" && type !== "broadcasted",
	);
	return lastInclusion?.type === "inBestBlock"
		? { status: "pending" }
		: { status: "failed" };
};

const isOriginSettled = (origin: OriginState) =>
	origin.status === "failed" ||
	origin.status === "finalized-without-message" ||
	(origin.status === "sent" && origin.finalized);

export type DestinationBlock =
	| { type: "block"; events: TxEvents }
	| { type: "unreachable" };

type RecentBlocks = { blocks: TxEvents[]; reachable: boolean };

type DestinationBlocks = { best: RecentBlocks; finalized: RecentBlocks };

type ArrivalWatch = { target: XcmDepositTarget; returnTokenIds: TokenId[] };

const findArrivalInBlocks = (
	blocks: TxEvents[],
	messageId: HexString,
	watch: ArrivalWatch,
	finalized: boolean,
): XcmArrival | null => {
	for (const blockEvents of blocks) {
		const arrival = findArrival(blockEvents, { messageId, ...watch });
		if (!arrival) continue;
		return arrival.success
			? { status: "arrived", messageId, received: arrival.received, finalized }
			: {
					status: "failed-on-destination",
					messageId,
					returned: arrival.returned,
					trapped: arrival.trapped,
					finalized,
				};
	}
	return null;
};

const toArrival = (
	origin: OriginState,
	destination: DestinationBlocks,
	isExpired: boolean,
	watch: ArrivalWatch,
): XcmArrival => {
	switch (origin.status) {
		case "pending":
			return { status: "awaiting-origin" };
		case "failed":
			return { status: "origin-failed" };
		case "finalized-without-message":
			return { status: "unconfirmed", messageId: null };
		case "sent": {
			const { messageId } = origin;
			const finalized = findArrivalInBlocks(
				destination.finalized.blocks,
				messageId,
				watch,
				true,
			);
			if (finalized) return finalized;
			if (isExpired) return { status: "unconfirmed", messageId };
			const provisional = findArrivalInBlocks(
				destination.best.blocks,
				messageId,
				watch,
				false,
			);
			if (provisional) return provisional;
			return destination.best.reachable && destination.finalized.reachable
				? { status: "in-transit", messageId }
				: { status: "unreachable", messageId };
		}
	}
};

const isFinalArrival = (arrival: XcmArrival) => {
	switch (arrival.status) {
		case "awaiting-origin":
		case "in-transit":
		case "unreachable":
			return false;
		case "arrived":
		case "failed-on-destination":
			return arrival.finalized;
		case "origin-failed":
		case "unconfirmed":
			return true;
	}
};

export const getArrivalBufferBlocks = (destination: ChainId) =>
	isChainIdHydration(destination) ? 10 : 30;

export const getXcmBlockEvents = (records: BlockRecords): TxEvents =>
	records
		.filter(({ phase }) => phase.type !== "ApplyExtrinsic")
		.map(({ event }) => event);

const NO_BLOCKS: RecentBlocks = { blocks: [], reachable: true };

const keepRecentBlocks = (
	blocks$: Observable<DestinationBlock>,
	bufferBlocks: number,
) =>
	blocks$.pipe(
		scan(
			(recent, block): RecentBlocks =>
				block.type === "unreachable"
					? { ...recent, reachable: false }
					: {
							blocks: [...recent.blocks, block.events].slice(-bufferBlocks),
							reachable: true,
						},
			NO_BLOCKS,
		),
		startWith(NO_BLOCKS),
	);

export const getXcmArrival$ = ({
	record$,
	bestBlockEvents$,
	finalizedBlockEvents$,
	target,
	returnTokenIds,
	destinationParaId,
	bufferBlocks,
	timeoutMs = ARRIVAL_TIMEOUT_MS,
}: {
	record$: Observable<TransactionRecord | undefined>;
	bestBlockEvents$: Observable<DestinationBlock>;
	finalizedBlockEvents$: Observable<DestinationBlock>;
	target: XcmDepositTarget;
	returnTokenIds: TokenId[];
	destinationParaId: number;
	bufferBlocks: number;
	timeoutMs?: number;
}): Observable<XcmArrival> => {
	const dismissed$ = record$.pipe(
		filter((record) => !record),
		take(1),
	);

	const origin$ = record$.pipe(
		filter((record) => !!record),
		map((record) => getOriginState(record, destinationParaId)),
		distinctUntilChanged(isEqual),
		takeWhile((origin) => !isOriginSettled(origin), true),
	);

	const destination$ = combineLatest([
		keepRecentBlocks(bestBlockEvents$, bufferBlocks),
		keepRecentBlocks(finalizedBlockEvents$, bufferBlocks),
	]).pipe(map(([best, finalized]): DestinationBlocks => ({ best, finalized })));

	const isExpired$ = origin$.pipe(
		filter((origin) => origin.status === "sent"),
		take(1),
		switchMap(() => timer(timeoutMs)),
		map(() => true),
		startWith(false),
	);

	return combineLatest([origin$, destination$, isExpired$]).pipe(
		takeUntil(dismissed$),
		map(([origin, destination, isExpired]) =>
			toArrival(origin, destination, isExpired, { target, returnTokenIds }),
		),
		distinctUntilChanged(isEqual),
		takeWhile((arrival) => !isFinalArrival(arrival), true),
	);
};

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

const getBlockEvents$ = (chainId: ChainId, at: "best" | "finalized") =>
	getCachedObservable$("xcmBlockEvents$", `${chainId}::${at}`, () =>
		watchBlockEvents$(chainId, at, getArrivalBufferBlocks(chainId)).pipe(
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);

const arrivalsSubject = new BehaviorSubject<Record<TransactionId, XcmArrival>>(
	{},
);

const trackXcmArrival$ = ({
	id,
	followUpData: { target, returnTokenIds },
}: XcmArrivalRecord) =>
	defer(() => {
		const destination = parseTokenId(target.tokenId).chainId;
		return getXcmArrival$({
			record$: transactions$.pipe(
				map((transactions) => transactions.find((tx) => tx.id === id)),
			),
			bestBlockEvents$: getBlockEvents$(destination, "best"),
			finalizedBlockEvents$: getBlockEvents$(destination, "finalized"),
			target,
			returnTokenIds,
			destinationParaId: getChainById(destination).paraId,
			bufferBlocks: getArrivalBufferBlocks(destination),
		});
	}).pipe(
		map((arrival) => [id, arrival] as const),
		catchError((error) => {
			logger.error("[xcm arrival] tracking failed", { id, error });
			return EMPTY;
		}),
	);

const forgetDismissedArrivals = (kept: Set<TransactionId>) => {
	const arrivals = arrivalsSubject.getValue();
	const dismissed = Object.keys(arrivals).filter((id) => !kept.has(id));
	if (dismissed.length) arrivalsSubject.next(omit(arrivals, dismissed));
};

export const trackXcmArrivals = () => {
	const tracked = new Set<TransactionId>();
	return transactions$
		.pipe(
			mergeMap((transactions) => {
				const ids = new Set(transactions.map(({ id }) => id));
				for (const id of tracked) if (!ids.has(id)) tracked.delete(id);
				forgetDismissedArrivals(ids);
				return transactions.filter(
					(tx): tx is XcmArrivalRecord =>
						isXcmArrivalRecord(tx) && !tracked.has(tx.id),
				);
			}),
			tap(({ id }) => tracked.add(id)),
			mergeMap(trackXcmArrival$),
		)
		.subscribe(([id, arrival]) => {
			arrivalsSubject.next({ ...arrivalsSubject.getValue(), [id]: arrival });
		});
};

export const getTrackedXcmArrival = (id: TransactionId): XcmArrival | null =>
	arrivalsSubject.getValue()[id] ?? null;

export const isAwaitingXcmArrival = (
	{ type, status }: TransactionRecord,
	arrival: XcmArrival | null,
) =>
	isXcmArrivalType(type) &&
	status === "finalized" &&
	!(arrival && isFinalArrival(arrival));

export const useXcmArrival = bindSerialized(
	(id: TransactionId) =>
		arrivalsSubject.pipe(
			map((arrivals) => arrivals[id] ?? null),
			distinctUntilChanged(),
		),
	(): XcmArrival | null => null,
);
