import type { PolkadotAccount } from "@kheopskit/core";
import type { Token } from "@kheopswap/registry";
import type { FollowUpTxEvent, FollowUpTxEvents } from "src/components";

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
	| "unknown";

export type TransactionRecord = {
	id: TransactionId;
	createdAt: number;
	status: TransactionStatus;
	txHash?: string;
	txEvents: FollowUpTxEvents;
	account: PolkadotAccount;
	feeEstimate: bigint;
	feeToken: Token;
	type: TransactionType;
	// Human-readable title for the transaction (e.g., "Swap DOT/USDC")
	title: string;
	// Feature-specific data for rendering the follow-up modal
	// biome-ignore lint/suspicious/noExplicitAny: varies by transaction type
	followUpData: Record<string, any>;
};

export const getStatusFromEvent = (
	event: FollowUpTxEvent,
): TransactionStatus => {
	switch (event.type) {
		case "pending":
			return "pending";
		case "signed":
			return "signed";
		case "broadcasted":
			return "broadcasted";
		case "txBestBlocksState":
			return event.found ? (event.ok ? "inBlock" : "failed") : "broadcasted";
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
