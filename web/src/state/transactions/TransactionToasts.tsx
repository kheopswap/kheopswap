import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@kheopswap/utils";
import { type FC, useCallback, useEffect, useRef } from "react";
import { type Id as ToastId, toast } from "react-toastify";
import { SpinnerBasicIcon } from "src/components/icons";
import { useTransactions } from "./TransactionsProvider";
import {
	isTerminalStatus,
	type TransactionRecord,
	type TransactionStatus,
} from "./types";

const getStatusText = (status: TransactionStatus): string => {
	switch (status) {
		case "pending":
			return "Waiting for signature...";
		case "signed":
			return "Submitting...";
		case "broadcasted":
			return "Submitted, waiting for block...";
		case "inBlock":
			return "In block, waiting for finalization...";
		case "finalized":
			return "Finalized";
		case "failed":
			return "Failed";
		default:
			return "Processing...";
	}
};

const getToastType = (
	status: TransactionStatus,
): "default" | "success" | "error" => {
	switch (status) {
		case "finalized":
			return "success";
		case "failed":
			return "error";
		default:
			return "default";
	}
};

const ToastContent: FC<{ tx: TransactionRecord; onClick: () => void }> = ({
	tx,
	onClick,
}) => {
	// Show spinner for all non-terminal statuses (including inBlock)
	const isLoading = !isTerminalStatus(tx.status);
	const isSuccess = tx.status === "finalized";
	const isError = tx.status === "failed";

	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-3 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
		>
			<div className="shrink-0">
				{isLoading && <SpinnerBasicIcon className="size-5 text-neutral-400" />}
				{isSuccess && (
					<div className="bg-success/20 rounded-full size-5 flex items-center justify-center">
						<CheckIcon className="size-3 stroke-success-500" />
					</div>
				)}
				{isError && (
					<div className="bg-error/20 rounded-full size-5 flex items-center justify-center">
						<XMarkIcon className="size-3 stroke-error-500" />
					</div>
				)}
			</div>
			<div className="flex flex-col min-w-0">
				<span
					className={cn(
						"text-sm font-medium truncate",
						isSuccess && "text-success",
						isError && "text-error",
					)}
				>
					{tx.title}
				</span>
				<span className="text-xs text-neutral-500 truncate">
					{getStatusText(tx.status)}
				</span>
			</div>
		</button>
	);
};

// Track all toasts globally to manage their lifecycle
const activeToasts = new Map<string, ToastId>();
// Track toasts we're dismissing programmatically (not by user action)
const programmaticDismissals = new Set<string>();

// Toast should be shown once transaction is signed (not just pending)
const shouldShowToast = (status: TransactionStatus): boolean => {
	return status !== "pending";
};

const TransactionToastManager: FC<{ tx: TransactionRecord }> = ({ tx }) => {
	const { open, dismiss } = useTransactions();
	// Use ref to avoid stale closure in onClose
	const dismissRef = useRef(dismiss);
	dismissRef.current = dismiss;

	const handleClick = useCallback(() => {
		// Just open the modal, don't dismiss the toast
		open(tx.id);
	}, [open, tx.id]);

	const handleToastClose = useCallback(() => {
		// Only dismiss from store if user manually closed the toast
		// (not when we programmatically dismissed it)
		if (programmaticDismissals.has(tx.id)) {
			programmaticDismissals.delete(tx.id);
			return;
		}
		activeToasts.delete(tx.id);
		dismissRef.current(tx.id);
	}, [tx.id]);

	// Manage toast based on transaction status (not isMinimized)
	// Toast appears once signed and stays visible regardless of modal state
	useEffect(() => {
		const toastType = getToastType(tx.status);
		const existingToast = activeToasts.get(tx.id);
		const showToast = shouldShowToast(tx.status);

		if (showToast) {
			if (existingToast === undefined) {
				// Create new toast
				const toastId = toast(<ToastContent tx={tx} onClick={handleClick} />, {
					toastId: tx.id,
					type: toastType,
					autoClose: false,
					closeOnClick: false,
					draggable: true,
					onClose: handleToastClose,
					icon: false,
				});
				activeToasts.set(tx.id, toastId);
			} else {
				// Update existing toast
				toast.update(existingToast, {
					render: <ToastContent tx={tx} onClick={handleClick} />,
					type: toastType,
				});
			}
		}
	}, [tx, handleClick, handleToastClose]);

	// Cleanup when transaction is removed from store
	useEffect(() => {
		return () => {
			const existingToast = activeToasts.get(tx.id);
			if (existingToast !== undefined) {
				// Mark as programmatic to prevent double-dismiss
				programmaticDismissals.add(tx.id);
				toast.dismiss(existingToast);
				activeToasts.delete(tx.id);
			}
		};
	}, [tx.id]);

	return null;
};

export const TransactionToasts: FC = () => {
	const { transactions } = useTransactions();

	return (
		<>
			{transactions.map((tx) => (
				<TransactionToastManager key={tx.id} tx={tx} />
			))}
		</>
	);
};
