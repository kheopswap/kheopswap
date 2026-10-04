import {
	CheckIcon,
	ExclamationTriangleIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { type FC, useCallback, useEffect, useRef } from "react";
import { type Id as ToastId, toast } from "react-toastify";
import { SpinnerBasicIcon } from "../../components/icons";
import { getChainById } from "../../registry/chains/chains";
import { parseTokenId } from "../../registry/tokens/helpers";
import { cn } from "../../utils/cn";
import {
	formatTxError,
	getErrorMessageFromTxEvents,
	type TxEvents,
} from "../../utils/getErrorMessageFromTxEvents";
import { useTransactions } from "./TransactionsProvider";
import type { TransactionRecord, TransactionStatus } from "./types";
import {
	isXcmArrivalType,
	useXcmArrival,
	type XcmArrival,
	type XcmTransferFollowUpData,
} from "./xcmArrival";

type ToastOutcome = "loading" | "success" | "error" | "warning";

type ToastView = { outcome: ToastOutcome; text: string };

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

const getStatusOutcome = (status: TransactionStatus): ToastOutcome => {
	switch (status) {
		case "finalized":
			return "success";
		case "failed":
			return "error";
		default:
			return "loading";
	}
};

const getArrivalView = (
	tx: TransactionRecord,
	arrival: XcmArrival | null,
): ToastView => {
	const { target } = tx.followUpData as XcmTransferFollowUpData;
	const destination = getChainById(parseTokenId(target.tokenId).chainId).name;

	switch (arrival?.status) {
		case "arrived":
			return { outcome: "success", text: `Arrived on ${destination}` };
		case "failed-on-destination":
			return {
				outcome: "error",
				text: `Failed on ${destination}, assets trapped`,
			};
		case "unconfirmed":
			return {
				outcome: "warning",
				text: `Arrival on ${destination} not confirmed`,
			};
		default:
			return { outcome: "loading", text: `In transit to ${destination}...` };
	}
};

export const getToastView = (
	tx: TransactionRecord,
	arrival: XcmArrival | null,
): ToastView => {
	if (tx.status === "finalized" && isXcmArrivalType(tx.type))
		return getArrivalView(tx, arrival);

	return {
		outcome: getStatusOutcome(tx.status),
		text: getTxErrorMessage(tx) ?? getStatusText(tx.status),
	};
};

const ToastContent: FC<{
	tx: TransactionRecord;
	view: ToastView;
	onClick: () => void;
}> = ({ tx, view, onClick }) => {
	const isLoading = view.outcome === "loading";
	const isSuccess = view.outcome === "success";
	const isError = view.outcome === "error";
	const isWarning = view.outcome === "warning";

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
				{isWarning && (
					<div className="bg-warn/20 rounded-full size-5 flex items-center justify-center">
						<ExclamationTriangleIcon className="size-3 stroke-warn-500" />
					</div>
				)}
			</div>
			<div className="flex flex-col min-w-0">
				<span
					className={cn(
						"text-sm font-medium truncate",
						isError && "text-error",
					)}
				>
					{tx.title}
				</span>
				<span className="text-xs text-neutral-500 truncate">{view.text}</span>
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

const getTxErrorMessage = (tx: TransactionRecord): string | null => {
	if (tx.status !== "failed") return null;

	const latestErrorEvent = [...tx.txEvents]
		.reverse()
		.find((event) => event.type === "error");

	if (latestErrorEvent?.type === "error") {
		const { error } = latestErrorEvent;

		if (error instanceof Error && error.message) return error.message;
		if (typeof error === "string" && error) return error;

		if (typeof error === "object" && error !== null) {
			if ("error" in error) {
				const formatted = formatTxError((error as { error: unknown }).error);
				if (formatted) return formatted;
			}

			if (
				"message" in error &&
				typeof (error as { message: unknown }).message === "string"
			) {
				return (error as { message: string }).message;
			}
		}
	}

	const allEvents: TxEvents = tx.txEvents.flatMap((event) =>
		event.type === "finalized" || event.type === "inBestBlock"
			? event.events
			: [],
	);

	if (allEvents.length === 0) return null;

	const txFailedErrorMessage = getErrorMessageFromTxEvents(allEvents);
	return txFailedErrorMessage || null;
};

const TransactionToastManager: FC<{ tx: TransactionRecord }> = ({ tx }) => {
	const { open, dismiss } = useTransactions();
	const arrival = useXcmArrival(tx.id);
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
		const view = getToastView(tx, arrival);
		const toastType = view.outcome === "loading" ? "default" : view.outcome;
		const existingToast = activeToasts.get(tx.id);
		const showToast = shouldShowToast(tx.status);
		const autoClose = tx.status === "failed" ? 5_000 : false;

		if (showToast) {
			if (existingToast === undefined) {
				// Create new toast
				const toastId = toast(
					<ToastContent tx={tx} view={view} onClick={handleClick} />,
					{
						toastId: tx.id,
						type: toastType,
						autoClose,
						closeOnClick: false,
						draggable: true,
						onClose: handleToastClose,
						icon: false,
					},
				);
				activeToasts.set(tx.id, toastId);
			} else {
				// Update existing toast
				toast.update(existingToast, {
					render: <ToastContent tx={tx} view={view} onClick={handleClick} />,
					type: toastType,
					autoClose,
				});
			}
		}
	}, [tx, arrival, handleClick, handleToastClose]);

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
