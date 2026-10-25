import { findLast, isEqual } from "lodash-es";
import type { HexString } from "polkadot-api";
import {
	combineLatest,
	distinctUntilChanged,
	filter,
	map,
	type Observable,
	scan,
	startWith,
	switchMap,
	take,
	takeUntil,
	takeWhile,
	timer,
} from "rxjs";
import type { TokenId } from "../../registry/tokens/types";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { XcmDepositTarget } from "../../utils/xcmDeposit";
import type { TransactionRecord } from "./types";
import {
	type FailedArrival,
	findArrival,
	getSentMessage,
	type SentMessage,
} from "./xcmArrivalEvents";
import type { DestinationBlock } from "./xcmDestinationBlocks";

const ARRIVAL_TIMEOUT_MS = 10 * 60_000;

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

type OriginState =
	| { status: "pending" }
	| { status: "failed" }
	| { status: "settled-without-message" }
	| ({ status: "sent" } & SentMessage);

const getOriginState = (
	record: TransactionRecord,
	destinationParaId: number,
): OriginState => {
	const sent = getSentMessage(record.txEvents, destinationParaId);
	if (sent) return { status: "sent", ...sent };
	switch (record.status) {
		case "finalized":
		case "lostTrack":
		case "unknown":
			return { status: "settled-without-message" };
		case "expired":
			return { status: "failed" };
		case "failed": {
			const lastInclusion = findLast(
				record.txEvents,
				({ type }) =>
					type !== "pending" && type !== "created" && type !== "broadcasted",
			);
			return lastInclusion?.type === "inBestBlock"
				? { status: "pending" }
				: { status: "failed" };
		}
		default:
			return { status: "pending" };
	}
};

const isOriginSettled = (origin: OriginState) =>
	origin.status === "failed" ||
	origin.status === "settled-without-message" ||
	(origin.status === "sent" && origin.finalized);

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
		case "settled-without-message":
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

export const isFinalArrival = (arrival: XcmArrival) => {
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
