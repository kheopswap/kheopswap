import {
	CheckIcon,
	ExclamationTriangleIcon,
	XMarkIcon,
} from "@heroicons/react/24/solid";
import type { FC, ReactNode } from "react";
import { FollowUpRow } from "../../components/FollowUpModal";
import { SpinnerIcon } from "../../components/icons";
import { Modal } from "../../components/Modal";
import { Pulse } from "../../components/Pulse";
import { Styles } from "../../components/styles";
import { Tokens } from "../../components/Tokens";
import { cn } from "../../utils/cn";
import { isBigInt } from "../../utils/isBigInt";
import { useTransactions } from "./TransactionsProvider";
import type { TransactionRecord, TransactionType } from "./types";
import { type FollowUpResult, useFollowUpStatus } from "./useFollowUpStatus";
import { useXcmArrival } from "./xcmArrival";

export type FollowUpContentMap = Partial<
	Record<TransactionType, FC<{ transaction: TransactionRecord }>>
>;

const FollowUpResultIcon: FC<{
	result: FollowUpResult;
	className?: string;
}> = ({ result, className }) => (
	<div className={cn("relative size-24", className)}>
		<SpinnerIcon
			className={cn(
				"absolute size-24 text-accent transition-opacity duration-500",
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
		<div
			className={cn(
				"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warn/20 p-2 transition-opacity duration-500",
				result === "warning" ? "opacity-100" : "opacity-0",
			)}
		>
			<ExclamationTriangleIcon className="size-12 text-warn" />
		</div>
	</div>
);

const FollowUpModalInner: FC<{
	transaction: TransactionRecord;
	onClose: () => void;
	children?: ReactNode;
}> = ({ transaction, onClose, children }) => {
	const arrival = useXcmArrival(transaction.id);
	const {
		blockExplorerUrl,
		error,
		message,
		result,
		errorMessage,
		isFinal,
		effectiveFee,
	} = useFollowUpStatus(transaction, arrival);
	const { title, feeEstimate, feeToken } = transaction;

	return (
		<div
			className={cn(
				"h-dvh max-h-dvh w-dvw max-w-dvw p-3 sm:p-4",
				"bg-surface backdrop-blur-md sm:border-grid/35",
				"sm:h-128 sm:w-auto sm:rounded-card sm:border sm:shadow-sm",
				"flex flex-col gap-4",
			)}
		>
			{title && <div className="font-semibold text-muted">{title}</div>}
			<div className="grow flex flex-col items-center justify-start">
				<div>
					<FollowUpResultIcon className="inline-block" result={result} />
				</div>
				<Pulse
					pulse={!error && !isFinal && result !== "loading"}
					className={cn(
						"text-xl font-medium text-muted transition-colors",
						(!!error || isFinal) && "text-text",
					)}
				>
					{message}
				</Pulse>
			</div>
			<div className="flex w-96 max-w-full flex-col justify-center gap-4 text-center">
				{!!errorMessage && <div className="text-error">{errorMessage}</div>}
				{children && <div>{children}</div>}
				<div className={cn(effectiveFee ? "block" : "hidden")}>
					<FollowUpRow label="Estimated fee" className="text-muted">
						<Tokens plancks={feeEstimate} token={feeToken} />
					</FollowUpRow>
					<FollowUpRow label="Effective fee">
						{isBigInt(effectiveFee) && (
							<Tokens
								plancks={effectiveFee}
								token={feeToken}
								className={cn(
									effectiveFee <= feeEstimate ? "text-success" : "text-warn",
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
					className={cn(
						Styles.button,
						"h-12 w-full font-medium disabled:opacity-50",
					)}
					disabled={!blockExplorerUrl}
				>
					View in block explorer
				</button>
				<button
					type="button"
					onClick={onClose}
					className={Styles.primaryButton}
				>
					Close
				</button>
			</div>
		</div>
	);
};

export const GlobalFollowUpModal: FC<{
	contentMap: FollowUpContentMap;
}> = ({ contentMap }) => {
	const { openTransaction, closeModal } = useTransactions();

	if (!openTransaction) return null;

	const Content = contentMap[openTransaction.type];

	return (
		<Modal isOpen aria-label={openTransaction.title ?? "Transaction status"}>
			<FollowUpModalInner
				transaction={openTransaction}
				onClose={() => closeModal(openTransaction.id)}
			>
				{Content && <Content transaction={openTransaction} />}
			</FollowUpModalInner>
		</Modal>
	);
};
