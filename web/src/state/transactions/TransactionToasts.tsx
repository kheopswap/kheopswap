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

const getToastMessage = (tx: TransactionRecord): string => {
	switch (tx.status) {
		case "pending":
			return "Waiting for signature...";
		case "signed":
			return "Submitting transaction...";
		case "broadcasted":
			return "Transaction submitted";
		case "inBlock":
			return "Transaction in block";
		case "finalized":
			return "Transaction finalized";
		case "failed":
			return "Transaction failed";
		default:
			return "Processing...";
	}
};

const getToastType = (
	status: TransactionStatus,
): "default" | "success" | "error" => {
	switch (status) {
		case "finalized":
		case "inBlock":
			return "success";
		case "failed":
			return "failed" as "error";
		default:
			return "default";
	}
};

const ToastContent: FC<{ tx: TransactionRecord; onClick: () => void }> = ({
	tx,
	onClick,
}) => {
	const isLoading = !isTerminalStatus(tx.status) && tx.status !== "inBlock";
	const isSuccess = tx.status === "finalized" || tx.status === "inBlock";
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
					{getToastMessage(tx)}
				</span>
				<span className="text-xs text-neutral-500 truncate">
					Click to view details
				</span>
			</div>
		</button>
	);
};

const TransactionToast: FC<{ tx: TransactionRecord }> = ({ tx }) => {
	const { open, dismiss } = useTransactions();
	const toastIdRef = useRef<ToastId | null>(null);
	const prevStatusRef = useRef<TransactionStatus>(tx.status);

	const handleClick = useCallback(() => {
		open(tx.id);
		// Don't dismiss the toast, just open the modal
		// Toast will be dismissed when transaction is dismissed from modal
	}, [open, tx.id]);

	const handleClose = useCallback(() => {
		dismiss(tx.id);
	}, [dismiss, tx.id]);

	// Create or update toast
	useEffect(() => {
		const toastType = getToastType(tx.status);

		if (toastIdRef.current === null) {
			// Create new toast
			toastIdRef.current = toast(
				<ToastContent tx={tx} onClick={handleClick} />,
				{
					toastId: tx.id,
					type: toastType,
					autoClose: false,
					closeOnClick: false,
					draggable: true,
					onClose: handleClose,
					icon: false,
				},
			);
		} else if (prevStatusRef.current !== tx.status) {
			// Update existing toast
			toast.update(toastIdRef.current, {
				render: <ToastContent tx={tx} onClick={handleClick} />,
				type: toastType,
			});
		}

		prevStatusRef.current = tx.status;
	}, [tx, handleClick, handleClose]);

	// Cleanup toast on unmount (when transaction is no longer minimized)
	useEffect(() => {
		return () => {
			if (toastIdRef.current !== null) {
				toast.dismiss(toastIdRef.current);
			}
		};
	}, []);

	return null;
};

export const TransactionToasts: FC = () => {
	const { minimizedTransactions } = useTransactions();

	return (
		<>
			{minimizedTransactions.map((tx) => (
				<TransactionToast key={tx.id} tx={tx} />
			))}
		</>
	);
};
