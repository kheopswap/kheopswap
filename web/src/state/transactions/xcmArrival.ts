import { omit } from "lodash-es";
import {
	BehaviorSubject,
	catchError,
	defer,
	distinctUntilChanged,
	EMPTY,
	map,
	mergeMap,
	tap,
} from "rxjs";
import { getChainById } from "../../registry/chains/chains";
import { parseTokenId } from "../../registry/tokens/helpers";
import { bindSerialized } from "../../utils/bindSerialized";
import { logger } from "../../utils/logger";
import { transactions$ } from "./transactionStore";
import type {
	TransactionId,
	TransactionRecord,
	TransactionType,
} from "./types";
import type { FailedArrival } from "./xcmArrivalEvents";
import {
	getXcmArrival$,
	isFinalArrival,
	type XcmArrival,
} from "./xcmArrivalState";
import {
	getArrivalBufferBlocks,
	getBlockEvents$,
} from "./xcmDestinationBlocks";

export type { XcmArrival } from "./xcmArrivalState";

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
