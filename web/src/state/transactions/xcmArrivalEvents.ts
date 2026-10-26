import type { HexString } from "polkadot-api";
import type { TokenAmount, TokenId } from "../../registry/tokens/types";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import {
	getXcmDepositMatcher,
	type XcmDepositTarget,
} from "../../utils/xcmDeposit";
import type { TransactionRecord } from "./types";

export type FailedArrival = { returned: TokenAmount[]; trapped: boolean };

export type SentMessage = { messageId: HexString; finalized: boolean };

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
