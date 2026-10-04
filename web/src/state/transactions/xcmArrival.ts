import { isEqual } from "lodash-es";
import type { HexString } from "polkadot-api";
import {
	BehaviorSubject,
	combineLatest,
	distinct,
	distinctUntilChanged,
	filter,
	map,
	mergeMap,
	type Observable,
	scan,
	startWith,
	switchMap,
	take,
	takeWhile,
	timer,
} from "rxjs";
import { getApi$ } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { Token } from "../../registry/tokens/types";
import { bindSerialized } from "../../utils/bindSerialized";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
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
const ARRIVAL_BUFFER_BLOCKS = 10;

const XCM_ARRIVAL_TYPES = [
	"xcmTransfer",
	"xcmSwap",
] as const satisfies readonly TransactionType[];

export type XcmArrivalType = (typeof XCM_ARRIVAL_TYPES)[number];

export const isXcmArrivalType = (
	type: TransactionType,
): type is XcmArrivalType =>
	XCM_ARRIVAL_TYPES.some((arrivalType) => arrivalType === type);

export type XcmTransferFollowUpData = {
	target: XcmDepositTarget;
	tokenOut: Token;
	estimatedReceived: bigint | undefined;
};

export type XcmArrival =
	| { status: "awaiting-origin" }
	| { status: "origin-failed" }
	| { status: "in-transit"; messageId: HexString }
	| { status: "arrived"; messageId: HexString; received: bigint | null }
	| { status: "failed-on-destination"; messageId: HexString }
	| { status: "unconfirmed"; messageId: HexString };

type OriginState =
	| { status: "pending" }
	| { status: "failed" }
	| { status: "sent"; messageId: HexString };

const isSameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const getSentMessageId = (
	txEvents: TransactionRecord["txEvents"],
	destinationParaId: number,
): HexString | null => {
	for (const txEvent of txEvents) {
		if (txEvent.type !== "inBestBlock" && txEvent.type !== "finalized")
			continue;
		for (const { type, value } of txEvent.events) {
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
	}
	return null;
};

export const findArrival = (
	blockEvents: TxEvents,
	{ messageId, target }: { messageId: HexString; target: XcmDepositTarget },
): { success: boolean; received: bigint | null } | null => {
	const getDeposit = getXcmDepositMatcher(target);
	let received: bigint | null = null;

	for (const event of blockEvents) {
		const deposit = getDeposit(event);
		if (deposit) {
			received = (received ?? 0n) + deposit;
			continue;
		}

		const { type, value } = event;
		if (
			type !== "MessageQueue" ||
			(value.type !== "Processed" && value.type !== "ProcessingFailed")
		)
			continue;

		if (!isSameHex(value.value.id, messageId)) {
			received = null;
			continue;
		}

		const success = value.type === "Processed" && value.value.success;
		return { success, received: success ? received : null };
	}

	return null;
};

const getOriginState = (
	record: TransactionRecord,
	destinationParaId: number,
): OriginState => {
	if (record.status === "failed") return { status: "failed" };
	const messageId = getSentMessageId(record.txEvents, destinationParaId);
	return messageId ? { status: "sent", messageId } : { status: "pending" };
};

const toArrival = (
	origin: OriginState,
	recentBlocks: TxEvents[],
	isExpired: boolean,
	target: XcmDepositTarget,
): XcmArrival => {
	switch (origin.status) {
		case "pending":
			return { status: "awaiting-origin" };
		case "failed":
			return { status: "origin-failed" };
		case "sent": {
			const { messageId } = origin;
			for (const blockEvents of recentBlocks) {
				const arrival = findArrival(blockEvents, { messageId, target });
				if (arrival)
					return arrival.success
						? { status: "arrived", messageId, received: arrival.received }
						: { status: "failed-on-destination", messageId };
			}
			return isExpired
				? { status: "unconfirmed", messageId }
				: { status: "in-transit", messageId };
		}
	}
};

const isFinalArrival = (arrival: XcmArrival) =>
	arrival.status !== "awaiting-origin" && arrival.status !== "in-transit";

export const getXcmArrival$ = ({
	record$,
	blockEvents$,
	target,
	destinationParaId,
	timeoutMs = ARRIVAL_TIMEOUT_MS,
}: {
	record$: Observable<TransactionRecord | undefined>;
	blockEvents$: Observable<TxEvents>;
	target: XcmDepositTarget;
	destinationParaId: number;
	timeoutMs?: number;
}): Observable<XcmArrival> => {
	const origin$ = record$.pipe(
		filter((record): record is TransactionRecord => !!record),
		map((record) => getOriginState(record, destinationParaId)),
		distinctUntilChanged(isEqual),
		takeWhile((origin) => origin.status === "pending", true),
	);

	const recentBlocks$ = blockEvents$.pipe(
		scan(
			(blocks, events) => [...blocks, events].slice(-ARRIVAL_BUFFER_BLOCKS),
			[] as TxEvents[],
		),
		startWith([] as TxEvents[]),
	);

	const isExpired$ = origin$.pipe(
		filter((origin) => origin.status === "sent"),
		take(1),
		switchMap(() => timer(timeoutMs)),
		map(() => true),
		startWith(false),
	);

	return combineLatest([origin$, recentBlocks$, isExpired$]).pipe(
		map(([origin, recentBlocks, isExpired]) =>
			toArrival(origin, recentBlocks, isExpired, target),
		),
		distinctUntilChanged(isEqual),
		takeWhile((arrival) => !isFinalArrival(arrival), true),
	);
};

const getBestBlockEvents$ = (chainId: ChainId) =>
	getApi$(chainId).pipe(
		switchMap((api) => api.query.System.Events.watchValue({ at: "best" })),
		map(({ value }) => value.map(({ event }) => event) as TxEvents),
	);

const arrivalsSubject = new BehaviorSubject<Record<TransactionId, XcmArrival>>(
	{},
);

export const trackXcmArrivals = () =>
	transactions$
		.pipe(
			mergeMap((transactions) =>
				transactions.filter(({ type }) => isXcmArrivalType(type)),
			),
			distinct(({ id }) => id),
			mergeMap(({ id, followUpData }) => {
				const { target } = followUpData as XcmTransferFollowUpData;
				const destination = parseTokenId(target.tokenId).chainId;
				return getXcmArrival$({
					record$: transactions$.pipe(
						map((transactions) => transactions.find((tx) => tx.id === id)),
					),
					blockEvents$: getBestBlockEvents$(destination),
					target,
					destinationParaId: getChainById(destination).paraId,
				}).pipe(map((arrival) => [id, arrival] as const));
			}),
		)
		.subscribe(([id, arrival]) => {
			arrivalsSubject.next({ ...arrivalsSubject.getValue(), [id]: arrival });
		});

export const useXcmArrival = bindSerialized(
	(id: TransactionId) =>
		arrivalsSubject.pipe(
			map((arrivals) => arrivals[id] ?? null),
			distinctUntilChanged(),
		),
	(): XcmArrival | null => null,
);
