import { useMemo } from "react";
import urlJoin from "url-join";
import type { FollowUpData } from "../../components/FollowUpModal";
import { getChainById } from "../../registry/chains/chains";
import {
	getErrorMessageFromTxEvents,
	type TxEvents,
} from "../../utils/getErrorMessageFromTxEvents";

export type FollowUpResult = "loading" | "success" | "error";

export const useFollowUpStatus = (followUp: FollowUpData) => {
	const blockExplorerUrl = useMemo(() => {
		const chain = getChainById(followUp.feeToken.chainId);
		if (!chain?.blockExplorerUrl) return null;

		for (const event of followUp.txEvents) {
			switch (event.type) {
				case "signed":
				case "broadcasted":
				case "txBestBlocksState":
				case "finalized":
					return urlJoin(chain.blockExplorerUrl, "tx", event.txHash);
				default:
					break;
			}
		}
		return null;
	}, [followUp]);

	const error = useMemo(
		() =>
			followUp.txEvents.find(
				(e): e is { type: "error"; error: unknown } => e.type === "error",
			)?.error,
		[followUp.txEvents],
	);

	const [message, canClose, result] = useMemo<
		[string, boolean, FollowUpResult]
	>(() => {
		if (error) return ["Transaction failed", true, "error"];

		const finalized = followUp.txEvents.find(
			(event) => event.type === "finalized",
		);
		if (finalized?.type === "finalized") {
			return finalized.ok
				? ["Transaction succeeded", true, "success"]
				: ["Transaction failed", true, "error"];
		}

		const best = followUp.txEvents.find(
			(event) => event.type === "txBestBlocksState",
		);
		if (best?.type === "txBestBlocksState" && best.found) {
			return best.ok
				? ["Waiting for finalization", true, "success"]
				: ["Waiting for finalization", true, "error"];
		}

		const broadcasted = followUp.txEvents.find(
			(event) => event.type === "broadcasted",
		);
		if (broadcasted?.type === "broadcasted")
			return ["Transaction submitted...", false, "loading"];

		const signed = followUp.txEvents.find((event) => event.type === "signed");
		if (signed?.type === "signed")
			return ["Submitting transaction...", false, "loading"];

		// Use walletName from the account if available (from kheopskit)
		const extensionName = followUp.account.walletName;

		return [`Approve in ${extensionName}`, false, "loading"];
	}, [followUp, error]);

	const [errorMessage, isPendingFinalization, isFinalized] = useMemo<
		[string | null, boolean, boolean]
	>(() => {
		const allEvents: TxEvents = followUp.txEvents.flatMap(
			(e) =>
				(e.type === "finalized" && e.events) ||
				(e.type === "txBestBlocksState" && e.found && e.events) ||
				[],
		);

		const errorMsg = error
			? ((error as Error).message ?? error.toString() ?? "Unknown error")
			: null;
		const txFailedErrorMessage = followUp.txEvents.some(
			(e) =>
				(e.type === "finalized" && !e.ok) ||
				(e.type === "txBestBlocksState" && e.found && !e.ok),
		)
			? getErrorMessageFromTxEvents(allEvents) // TODO cleanup, since papi 1.13 no need to lookup for extrinsic failed, we have event.dispatchError
			: null;

		return [
			errorMsg ?? txFailedErrorMessage ?? null,
			result !== "loading" &&
				!followUp.txEvents.some((e) => e.type === "finalized"),
			followUp.txEvents.some((e) => e.type === "finalized"),
		];
	}, [followUp.txEvents, result, error]);

	const effectiveFee = useMemo(() => {
		if (result !== "success") return null;

		const allEvents: TxEvents = followUp.txEvents.flatMap(
			(e) =>
				(e.type === "finalized" && e.events) ||
				(e.type === "txBestBlocksState" && e.found && e.events) ||
				[],
		);

		const actualFee = allEvents.find(
			(e) =>
				(e.type === "TransactionPayment" &&
					e.value.type === "TransactionFeePaid") ||
				(e.type === "AssetTxPayment" && e.value.type === "AssetTxFeePaid"),
		)?.value.value.actual_fee;
		return actualFee ? BigInt(actualFee) : null;
	}, [followUp.txEvents, result]);

	return {
		blockExplorerUrl,
		error,
		message,
		canClose,
		result,
		errorMessage,
		isPendingFinalization,
		isFinalized,
		effectiveFee,
	};
};
