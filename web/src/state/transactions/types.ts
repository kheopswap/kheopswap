import type { TxEvent } from "polkadot-api";
import type { WalletAccount } from "../../common/kheopskit";
import type { AmmPath } from "../../features/swap/routes/ammPath";
import type { ChainId } from "../../registry/chains/types";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { XcmDepositTarget } from "../../utils/xcmDeposit";

export type FollowUpTxEvent =
	| TxEvent
	| { type: "pending" }
	| { type: "unconfirmed" }
	| { type: "error"; error: unknown };
export type FollowUpTxEvents = FollowUpTxEvent[];

export type TransactionId = string;

export type TransactionStatus =
	| "pending"
	| "signed"
	| "broadcasted"
	| "inBlock"
	| "unconfirmed"
	| "finalized"
	| "failed";

export type SwapFollowUpData = {
	swapPlancksOut: bigint;
	minPlancksOut: bigint;
	slippage: number;
	tokenOut: Token;
};

export type XcmTransferFollowUpData = {
	origin: ChainId;
	target: XcmDepositTarget;
	returnTokenIds: TokenId[];
	tokenOut: Token;
	estimatedReceived: bigint | undefined;
};

export type XcmSwapFollowUpData = XcmTransferFollowUpData & {
	swap: {
		path: AmmPath;
		swapPlancksIn: bigint;
		swapPlancksOut: bigint;
		mirrorToken: Token;
	};
};

export type TransactionFollowUp =
	| { type: "swap"; followUpData: SwapFollowUpData }
	| {
			type: "xcmTransfer" | "xcmDestinationSwap";
			followUpData: XcmTransferFollowUpData;
	  }
	| { type: "xcmSwap"; followUpData: XcmSwapFollowUpData }
	| {
			type:
				| "transfer"
				| "addLiquidity"
				| "removeLiquidity"
				| "createPool"
				| "unknown";
			followUpData?: undefined;
	  };

export type TransactionType = TransactionFollowUp["type"];

export type TransactionRecord = {
	id: TransactionId;
	createdAt: number;
	status: TransactionStatus;
	txHash?: string;
	txEvents: FollowUpTxEvents;
	account: WalletAccount;
	feeEstimate: bigint;
	feeToken: Token;
	title: string;
} & TransactionFollowUp;

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
		case "unconfirmed":
			return "unconfirmed";
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

export const isSettled = ({ txEvents }: TransactionRecord): boolean =>
	txEvents.some(({ type }) => type === "finalized" || type === "error");

export const isAwaitingInclusion = ({ status }: TransactionRecord): boolean =>
	status === "pending" ||
	status === "signed" ||
	status === "broadcasted" ||
	status === "unconfirmed";

export type TxInclusion = Extract<
	FollowUpTxEvent,
	{ type: "inBestBlock" | "finalized" }
>;

export const getCurrentInclusion = (
	txEvents: FollowUpTxEvents,
): TxInclusion | null => {
	let current: TxInclusion | null = null;
	for (const event of txEvents) {
		switch (event.type) {
			case "finalized":
				return event;
			case "inBestBlock":
				current = event;
				break;
			case "notInBestBlock":
				current = null;
				break;
			default:
				break;
		}
	}
	return current;
};

export const getIncludedTxEvents = (txEvents: FollowUpTxEvents): TxEvents =>
	getCurrentInclusion(txEvents)?.events ?? [];
