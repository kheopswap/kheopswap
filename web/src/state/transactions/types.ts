import type { WalletAccount } from "../../common/kheopskit";
import type {
	FollowUpTxEvent,
	FollowUpTxEvents,
} from "../../components/FollowUpModal";
import type { Token } from "../../registry/tokens/types";

export type TransactionId = string;

export type TransactionStatus =
	| "pending"
	| "signed"
	| "broadcasted"
	| "inBlock"
	| "finalized"
	| "failed";

export type TransactionType =
	| "swap"
	| "transfer"
	| "addLiquidity"
	| "removeLiquidity"
	| "createPool"
	| "xcmTransfer"
	| "xcmSwap"
	| "xcmDestinationSwap"
	| "unknown";

export type TransactionRecord = {
	id: TransactionId;
	createdAt: number;
	status: TransactionStatus;
	txHash?: string;
	txEvents: FollowUpTxEvents;
	account: WalletAccount;
	feeEstimate: bigint;
	feeToken: Token;
	type: TransactionType;
	title: string;
	// biome-ignore lint/suspicious/noExplicitAny: varies by transaction type
	followUpData: Record<string, any>;
};

export const getStatusFromEvent = (
	event: FollowUpTxEvent,
): TransactionStatus => {
	switch (event.type) {
		case "pending":
			return "pending";
		case "created":
			return "signed";
		case "broadcasted":
			return "broadcasted";
		case "inBestBlock":
			return event.ok ? "inBlock" : "failed";
		case "notInBestBlock":
			return "broadcasted";
		case "finalized":
			return event.ok ? "finalized" : "failed";
		case "error":
			return "failed";
		default:
			return "pending";
	}
};

export const isTerminalStatus = (status: TransactionStatus): boolean =>
	status === "finalized" || status === "failed";
