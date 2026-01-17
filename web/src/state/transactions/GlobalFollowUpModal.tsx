import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { getChainById } from "@kheopswap/registry";
import {
	cn,
	getErrorMessageFromTxEvents,
	isBigInt,
	type TxEvents,
} from "@kheopswap/utils";
import { type FC, type ReactNode, useMemo } from "react";
import { type FollowUpData, FollowUpRow } from "src/components/FollowUpModal";
import { SpinnerIcon } from "src/components/icons";
import { Modal } from "src/components/Modal";
import { Pulse } from "src/components/Pulse";
import { Styles } from "src/components/styles";
import { Tokens } from "src/components/Tokens";
import { CreatePoolFollowUpContent } from "src/features/liquidity/create-pool/CreatePoolFollowUpContent";
import { SwapFollowUpContent } from "src/features/swap/SwapFollowUpContent";
import { TeleportFollowUpContent } from "src/features/teleport/TeleportFollowUpContent";
import urlJoin from "url-join";
import { useTransactions } from "./TransactionsProvider";
import type { TransactionRecord } from "./types";

const getFollowUpContent = (tx: TransactionRecord): ReactNode => {
	switch (tx.type) {
		case "swap":
			return <SwapFollowUpContent transaction={tx} />;
		case "teleport":
			return <TeleportFollowUpContent transaction={tx} />;
		case "createPool":
			return <CreatePoolFollowUpContent transaction={tx} />;
		default:
			return null;
	}
};

const convertToFollowUpData = (tx: TransactionRecord): FollowUpData => ({
	txEvents: tx.txEvents,
	account: tx.account,
	feeEstimate: tx.feeEstimate,
	feeToken: tx.feeToken,
	...tx.followUpData,
});

const FollowUpResultIcon: FC<{
	result: "loading" | "success" | "error";
	className?: string;
}> = ({ result, className }) => (
	<div className={cn("relative size-24", className)}>
		<SpinnerIcon
			className={cn(
				"absolute size-24 transition-opacity duration-500",
				result === "loading" ? "opacity-100" : "opacity-0",
			)}
		/>
		<div
			className={cn(
				"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/20 p-2 transition-opacity duration-500",
				result === "success" ? "opacity-100" : "opacity-0",
			)}
		>
			<CheckIcon className="size-12 text-success" />
		</div>
		<div
			className={cn(
				"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-error/20 p-2 transition-opacity duration-500",
				result === "error" ? "opacity-100" : "opacity-0",
			)}
		>
			<XMarkIcon className="size-12 text-error" />
		</div>
	</div>
);

const FollowUpModalInner: FC<{
	followUp: FollowUpData;
	onClose: () => void;
	canAlwaysClose?: boolean;
	title?: string;
	children?: ReactNode;
}> = ({ followUp, onClose, canAlwaysClose = false, title, children }) => {
	const chain = useMemo(
		() => getChainById(followUp.feeToken.chainId),
		[followUp.feeToken.chainId],
	);

	const blockExplorerUrl = useMemo(() => {
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
	}, [followUp, chain]);

	const error = useMemo(
		() =>
			followUp.txEvents.find(
				(e): e is { type: "error"; error: unknown } => e.type === "error",
			)?.error,
		[followUp.txEvents],
	);

	const [message, canClose, result] = useMemo<
		[string, boolean, "loading" | "success" | "error"]
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

	const [individualEvents, errorMessage, isPendingFinalization, isFinalized] =
		useMemo<[TxEvents, string | null, boolean, boolean]>(() => {
			const allEvents: TxEvents = followUp.txEvents.flatMap(
				(e) =>
					(e.type === "finalized" && e.events) ||
					(e.type === "txBestBlocksState" && e.found && e.events) ||
					[],
			);

			const errorMessage = error
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
				allEvents,
				errorMessage ?? txFailedErrorMessage ?? null,
				result !== "loading" &&
					!followUp.txEvents.some((e) => e.type === "finalized"),
				followUp.txEvents.some((e) => e.type === "finalized"),
			];
		}, [followUp.txEvents, result, error]);

	const effectiveFee = useMemo(() => {
		if (result !== "success") return null;
		const actualFee = individualEvents.find(
			(e) =>
				(e.type === "TransactionPayment" &&
					e.value.type === "TransactionFeePaid") ||
				(e.type === "AssetTxPayment" && e.value.type === "AssetTxFeePaid"),
		)?.value.value.actual_fee;
		return actualFee ? BigInt(actualFee) : null;
	}, [individualEvents, result]);

	return (
		<div
			className={cn(
				"h-dvh max-h-dvh w-dvw max-w-dvw p-3 sm:p-4",
				"bg-black sm:border-neutral-850",
				"sm:h-128 sm:w-auto sm:rounded-xl sm:border sm:shadow-sm",
				"flex flex-col gap-4",
			)}
		>
			{title && <div className=" font-semibold text-neutral">{title}</div>}
			<div className="grow flex flex-col items-center justify-start">
				<div>
					<FollowUpResultIcon className="inline-block" result={result} />
				</div>
				<Pulse
					pulse={!error && isPendingFinalization}
					className={cn(
						"text-xl font-medium text-neutral-300 transition-colors",
						(!!error || isFinalized) && "text-neutral-100",
					)}
				>
					{message ?? null}
				</Pulse>
			</div>
			<div className="flex w-96 max-w-full flex-col justify-center gap-4 text-center">
				{!!errorMessage && <div className="text-error">{errorMessage}</div>}
				{children && <div>{children}</div>}
				<div className={cn(effectiveFee ? "block" : "hidden")}>
					<FollowUpRow label="Estimated fee" className="text-neutral-500">
						<Tokens plancks={followUp.feeEstimate} token={followUp.feeToken} />
					</FollowUpRow>
					<FollowUpRow label="Effective fee">
						{isBigInt(effectiveFee) && (
							<Tokens
								plancks={effectiveFee}
								token={followUp.feeToken}
								className={cn(
									effectiveFee <= followUp.feeEstimate
										? "text-success"
										: "text-warn",
								)}
							/>
						)}
					</FollowUpRow>
				</div>
			</div>
			<div className="space-y-2">
				<button
					type="button"
					onClick={() => {
						if (blockExplorerUrl)
							window.open(blockExplorerUrl, "_blank", "noopener noreferrer");
					}}
					className={cn(Styles.button, "h-12 w-full  disabled:opacity-50")}
					disabled={!blockExplorerUrl}
				>
					View in block explorer
				</button>
				<button
					type="button"
					onClick={onClose}
					className={cn(
						Styles.button,
						"h-12 w-full border-primary-400 bg-primary enabled:hover:bg-primary-450 disabled:opacity-50",
					)}
					disabled={!canAlwaysClose && !canClose}
				>
					Close
				</button>
			</div>
		</div>
	);
};

export const GlobalFollowUpModal: FC = () => {
	const { openTransaction, closeModal } = useTransactions();

	if (!openTransaction) return null;

	const followUpData = convertToFollowUpData(openTransaction);

	const handleClose = () => {
		closeModal(openTransaction.id);
	};

	return (
		<Modal isOpen>
			<FollowUpModalInner
				followUp={followUpData}
				onClose={handleClose}
				canAlwaysClose
				title={openTransaction.title}
			>
				{getFollowUpContent(openTransaction)}
			</FollowUpModalInner>
		</Modal>
	);
};
