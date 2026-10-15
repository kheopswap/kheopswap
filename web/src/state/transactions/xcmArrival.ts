import { isEqual } from "lodash-es";
import {
	AccountId,
	Binary,
	type HexString,
	type SS58String,
} from "polkadot-api";
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
import type { ChainIdHydration } from "../../registry/chains/types";
import type { Token } from "../../registry/tokens/types";
import { bindSerialized } from "../../utils/bindSerialized";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { transactions$ } from "./transactionStore";
import type { TransactionId, TransactionRecord } from "./types";

const ARRIVAL_TIMEOUT_MS = 10 * 60_000;
const ARRIVAL_BUFFER_BLOCKS = 10;

export type XcmArrivalTarget = {
	destination: ChainIdHydration;
	assetId: number;
	beneficiary: SS58String;
};

export type XcmTransferFollowUpData = {
	target: XcmArrivalTarget;
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

const toPublicKey = (address: SS58String) =>
	Binary.toHex(AccountId().enc(address));

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
	{ messageId, target }: { messageId: HexString; target: XcmArrivalTarget },
): { success: boolean; received: bigint | null } | null => {
	const beneficiaryKey = toPublicKey(target.beneficiary);
	let received: bigint | null = null;

	for (const { type, value } of blockEvents) {
		if (
			type === "Tokens" &&
			value.type === "Deposited" &&
			value.value.currency_id === target.assetId &&
			toPublicKey(value.value.who) === beneficiaryKey
		) {
			received = (received ?? 0n) + value.value.amount;
			continue;
		}

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
	target: XcmArrivalTarget,
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
	target: XcmArrivalTarget;
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

const getBestBlockEvents$ = (chainId: ChainIdHydration) =>
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
				transactions.filter(({ type }) => type === "xcmTransfer"),
			),
			distinct(({ id }) => id),
			mergeMap(({ id, followUpData }) => {
				const { target } = followUpData as XcmTransferFollowUpData;
				return getXcmArrival$({
					record$: transactions$.pipe(
						map((transactions) => transactions.find((tx) => tx.id === id)),
					),
					blockEvents$: getBestBlockEvents$(target.destination),
					target,
					destinationParaId: getChainById(target.destination).paraId,
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
