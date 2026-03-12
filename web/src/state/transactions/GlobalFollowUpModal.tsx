import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type { FC, ReactNode } from "react";
import { type FollowUpData, FollowUpRow } from "../../components/FollowUpModal";
import { SpinnerIcon } from "../../components/icons";
import { Modal } from "../../components/Modal";
import { Pulse } from "../../components/Pulse";
import { Styles } from "../../components/styles";
import { Tokens } from "../../components/Tokens";
import { CreatePoolFollowUpContent } from "../../features/liquidity/create-pool/CreatePoolFollowUpContent";
import { SwapFollowUpContent } from "../../features/swap/SwapFollowUpContent";
import { cn } from "../../utils/cn";
import { isBigInt } from "../../utils/isBigInt";
import { useTransactions } from "./TransactionsProvider";
import type { TransactionRecord } from "./types";
import { type FollowUpResult, useFollowUpStatus } from "./useFollowUpStatus";

const getFollowUpContent = (tx: TransactionRecord): ReactNode => {
	switch (tx.type) {
		case "swap":
			return <SwapFollowUpContent transaction={tx} />;
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
	result: FollowUpResult;
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
	const {
		blockExplorerUrl,
		error,
		message,
		canClose,
		result,
		errorMessage,
		isPendingFinalization,
		isFinalized,
		effectiveFee,
	} = useFollowUpStatus(followUp);

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
		<Modal isOpen aria-label={openTransaction.title ?? "Transaction status"}>
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
