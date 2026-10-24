import { useMemo } from "react";
import urlJoin from "url-join";
import { getChainById } from "../../registry/chains/chains";
import { getErrorMessageFromTxEvents } from "../../utils/getErrorMessageFromTxEvents";
import {
	getCurrentInclusion,
	type TransactionRecord,
	type TxInclusion,
} from "./types";
import {
	getXcmArrivalOutcome,
	isXcmArrivalRecord,
	type XcmArrival,
} from "./xcmArrival";

export type FollowUpResult = "loading" | "success" | "error" | "warning";

type FollowUpHeadline = {
	message: string;
	result: FollowUpResult;
	isFinal: boolean;
};

const TRANSACTION_FAILED: FollowUpHeadline = {
	message: "Transaction failed",
	result: "error",
	isFinal: true,
};

const getHeadline = (
	transaction: TransactionRecord,
	inclusion: TxInclusion | null,
	arrival: XcmArrival | null,
	error: unknown,
): FollowUpHeadline => {
	if (error) return TRANSACTION_FAILED;

	const { txEvents, account } = transaction;
	const xcmOutcome = isXcmArrivalRecord(transaction)
		? getXcmArrivalOutcome(transaction, arrival)
		: null;

	if (inclusion?.type === "finalized") {
		if (!inclusion.ok) return TRANSACTION_FAILED;
		if (xcmOutcome)
			return {
				message: xcmOutcome.text,
				result: xcmOutcome.kind,
				isFinal: xcmOutcome.final,
			};
		return {
			message: "Transaction succeeded",
			result: "success",
			isFinal: true,
		};
	}

	if (inclusion?.type === "inBestBlock") {
		if (inclusion.ok && xcmOutcome)
			return {
				message: xcmOutcome.text,
				result: xcmOutcome.kind,
				isFinal: false,
			};
		return {
			message: "Waiting for finalization",
			result: inclusion.ok ? "success" : "error",
			isFinal: false,
		};
	}

	if (txEvents.some((event) => event.type === "broadcasted"))
		return {
			message: "Transaction submitted...",
			result: "loading",
			isFinal: false,
		};

	if (txEvents.some((event) => event.type === "created"))
		return {
			message: "Submitting transaction...",
			result: "loading",
			isFinal: false,
		};

	return {
		message: `Approve in ${account.walletName}`,
		result: "loading",
		isFinal: false,
	};
};

const getPaidFee = (inclusion: TxInclusion): bigint | null => {
	const actualFee = inclusion.events.find(
		(e) =>
			(e.type === "TransactionPayment" &&
				e.value.type === "TransactionFeePaid") ||
			(e.type === "AssetTxPayment" && e.value.type === "AssetTxFeePaid"),
	)?.value.value.actual_fee;
	return actualFee ? BigInt(actualFee) : null;
};

export const useFollowUpStatus = (
	transaction: TransactionRecord,
	arrival: XcmArrival | null,
) => {
	const { txEvents, account, feeToken } = transaction;

	const blockExplorerUrl = useMemo(() => {
		const chain = getChainById(feeToken.chainId);
		if (!chain) return null;

		// Ethereum accounts submit through the Revive precompile, so their txHash is an
		// EVM transaction hash that only the EVM explorer can resolve.
		const [baseUrl, path] =
			account.platform === "ethereum"
				? [chain.evmBlockExplorers?.[0], "tx"]
				: [chain.blockExplorerUrl, "extrinsic"];
		if (!baseUrl) return null;

		for (const event of txEvents) {
			switch (event.type) {
				case "created":
				case "broadcasted":
				case "inBestBlock":
				case "notInBestBlock":
				case "finalized":
					return urlJoin(baseUrl, path, event.txHash);
				default:
					break;
			}
		}
		return null;
	}, [txEvents, account.platform, feeToken.chainId]);

	const error = useMemo(
		() =>
			txEvents.find(
				(e): e is { type: "error"; error: unknown } => e.type === "error",
			)?.error,
		[txEvents],
	);

	const inclusion = useMemo(() => getCurrentInclusion(txEvents), [txEvents]);

	const headline = useMemo(
		() => getHeadline(transaction, inclusion, arrival, error),
		[transaction, inclusion, arrival, error],
	);

	const errorMessage = useMemo(() => {
		if (error)
			return (error as Error).message ?? error.toString() ?? "Unknown error";
		return inclusion && !inclusion.ok
			? getErrorMessageFromTxEvents(inclusion.events)
			: null;
	}, [inclusion, error]);

	const effectiveFee = useMemo(
		() => (inclusion?.ok ? getPaidFee(inclusion) : null),
		[inclusion],
	);

	return {
		blockExplorerUrl,
		error,
		...headline,
		errorMessage,
		effectiveFee,
	};
};
