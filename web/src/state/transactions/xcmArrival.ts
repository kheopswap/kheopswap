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
import { getChainById, isChainIdHydration } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { Token, TokenAmount, TokenId } from "../../registry/tokens/types";
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

export type XcmTransferFollowUpData = {
	origin: ChainId;
	target: XcmDepositTarget;
	returnTokenIds: TokenId[];
	tokenOut: Token;
	estimatedReceived: bigint | undefined;
};

type FailedArrival = { returned: TokenAmount[]; trapped: boolean };

export type XcmArrival =
	| { status: "awaiting-origin" }
	| { status: "origin-failed" }
	| { status: "in-transit"; messageId: HexString }
	| { status: "arrived"; messageId: HexString; received: bigint | null }
	| ({ status: "failed-on-destination"; messageId: HexString } & FailedArrival)
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
	watch: { target: XcmDepositTarget; returnTokenIds: TokenId[] },
): XcmArrival => {
	switch (origin.status) {
		case "pending":
			return { status: "awaiting-origin" };
		case "failed":
			return { status: "origin-failed" };
		case "sent": {
			const { messageId } = origin;
			for (const blockEvents of recentBlocks) {
				const arrival = findArrival(blockEvents, { messageId, ...watch });
				if (arrival)
					return arrival.success
						? { status: "arrived", messageId, received: arrival.received }
						: {
								status: "failed-on-destination",
								messageId,
								returned: arrival.returned,
								trapped: arrival.trapped,
							};
			}
			return isExpired
				? { status: "unconfirmed", messageId }
				: { status: "in-transit", messageId };
		}
	}
};

const isFinalArrival = (arrival: XcmArrival) =>
	arrival.status !== "awaiting-origin" && arrival.status !== "in-transit";

export const getArrivalBufferBlocks = (destination: ChainId) =>
	isChainIdHydration(destination) ? 10 : 30;

export const getXcmBlockEvents = (
	records: { phase: { type: string }; event: TxEvents[number] }[],
): TxEvents =>
	records
		.filter(({ phase }) => phase.type !== "ApplyExtrinsic")
		.map(({ event }) => event);

export const getXcmArrival$ = ({
	record$,
	blockEvents$,
	target,
	returnTokenIds,
	destinationParaId,
	bufferBlocks,
	timeoutMs = ARRIVAL_TIMEOUT_MS,
}: {
	record$: Observable<TransactionRecord | undefined>;
	blockEvents$: Observable<TxEvents>;
	target: XcmDepositTarget;
	returnTokenIds: TokenId[];
	destinationParaId: number;
	bufferBlocks: number;
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
			(blocks, events) => [...blocks, events].slice(-bufferBlocks),
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
			toArrival(origin, recentBlocks, isExpired, { target, returnTokenIds }),
		),
		distinctUntilChanged(isEqual),
		takeWhile((arrival) => !isFinalArrival(arrival), true),
	);
};

const getBestBlockEvents$ = (chainId: ChainId) =>
	getApi$(chainId).pipe(
		switchMap((api) => api.query.System.Events.watchValue({ at: "best" })),
		map(({ value }) => getXcmBlockEvents(value)),
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
				const { target, returnTokenIds } =
					followUpData as XcmTransferFollowUpData;
				const destination = parseTokenId(target.tokenId).chainId;
				return getXcmArrival$({
					record$: transactions$.pipe(
						map((transactions) => transactions.find((tx) => tx.id === id)),
					),
					blockEvents$: getBestBlockEvents$(destination),
					target,
					returnTokenIds,
					destinationParaId: getChainById(destination).paraId,
					bufferBlocks: getArrivalBufferBlocks(destination),
				}).pipe(map((arrival) => [id, arrival] as const));
			}),
		)
		.subscribe(([id, arrival]) => {
			arrivalsSubject.next({ ...arrivalsSubject.getValue(), [id]: arrival });
		});

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
