import { useMemo } from "react";
import urlJoin from "url-join";
import { getChainById } from "../../registry/chains/chains";
import {
	getErrorMessageFromTxEvents,
	type TxEvents,
} from "../../utils/getErrorMessageFromTxEvents";
import type { TransactionRecord } from "./types";
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

const getHeadline = (
	transaction: TransactionRecord,
	arrival: XcmArrival | null,
	error: unknown,
): FollowUpHeadline => {
	if (error)
		return {
			message: "Transaction failed",
			result: "error",
			isFinal: true,
		};

	const { txEvents, account } = transaction;
	const xcmOutcome = isXcmArrivalRecord(transaction)
		? getXcmArrivalOutcome(transaction, arrival)
		: null;

	const finalized = txEvents.find((event) => event.type === "finalized");
	if (finalized?.type === "finalized") {
		if (!finalized.ok)
			return {
				message: "Transaction failed",
				result: "error",
				isFinal: true,
			};
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

	const best = txEvents.find((event) => event.type === "inBestBlock");
	if (best?.type === "inBestBlock") {
		if (best.ok && xcmOutcome)
			return {
				message: xcmOutcome.text,
				result: xcmOutcome.kind,
				isFinal: false,
			};
		return {
			message: "Waiting for finalization",
			result: best.ok ? "success" : "error",
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

	const headline = useMemo(
		() => getHeadline(transaction, arrival, error),
		[transaction, arrival, error],
	);

	const allEvents = useMemo<TxEvents>(
		() =>
			txEvents.flatMap((e) =>
				e.type === "finalized" || e.type === "inBestBlock" ? e.events : [],
			),
		[txEvents],
	);

	const errorMessage = useMemo(() => {
		if (error)
			return (error as Error).message ?? error.toString() ?? "Unknown error";
		return txEvents.some(
			(e) =>
				(e.type === "finalized" && !e.ok) ||
				(e.type === "inBestBlock" && !e.ok),
		)
			? getErrorMessageFromTxEvents(allEvents)
			: null;
	}, [txEvents, allEvents, error]);

	const effectiveFee = useMemo(() => {
		const isIncluded = txEvents.some(
			(e) => (e.type === "finalized" || e.type === "inBestBlock") && e.ok,
		);
		if (!isIncluded) return null;

		const actualFee = allEvents.find(
			(e) =>
				(e.type === "TransactionPayment" &&
					e.value.type === "TransactionFeePaid") ||
				(e.type === "AssetTxPayment" && e.value.type === "AssetTxFeePaid"),
		)?.value.value.actual_fee;
		return actualFee ? BigInt(actualFee) : null;
	}, [allEvents, txEvents]);

	return {
		blockExplorerUrl,
		error,
		...headline,
		errorMessage,
		effectiveFee,
	};
};
