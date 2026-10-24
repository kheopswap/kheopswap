import {
	CheckIcon,
	ExclamationTriangleIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { type FC, useCallback, useEffect, useRef } from "react";
import { type Id as ToastId, toast } from "react-toastify";
import { SpinnerBasicIcon } from "../../components/icons";
import { cn } from "../../utils/cn";
import {
	formatTxError,
	getErrorMessageFromTxEvents,
	type TxEvents,
} from "../../utils/getErrorMessageFromTxEvents";
import { useTransactions } from "./TransactionsProvider";
import type { TransactionRecord, TransactionStatus } from "./types";
import {
	getXcmArrivalOutcome,
	isXcmArrivalType,
	useXcmArrival,
	type XcmArrival,
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

export const getToastView = (
	tx: TransactionRecord,
	arrival: XcmArrival | null,
): ToastView => {
	if (tx.status === "finalized" && isXcmArrivalType(tx.type)) {
		const { kind, text } = getXcmArrivalOutcome(tx, arrival);
		return { outcome: kind, text };
	}

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
				{isLoading && <SpinnerBasicIcon className="size-5 text-muted" />}
				{isSuccess && (
					<div className="bg-success/20 rounded-full size-5 flex items-center justify-center">
						<CheckIcon className="size-3 text-success" />
					</div>
				)}
				{isError && (
					<div className="bg-error/20 rounded-full size-5 flex items-center justify-center">
						<XMarkIcon className="size-3 text-error" />
					</div>
				)}
				{isWarning && (
					<div className="bg-warn/20 rounded-full size-5 flex items-center justify-center">
						<ExclamationTriangleIcon className="size-3 text-warn" />
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
				<span className="text-xs text-muted truncate">{view.text}</span>
			</div>
		</button>
	);
};

const activeToasts = new Map<string, ToastId>();
const programmaticDismissals = new Set<string>();

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
	const dismissRef = useRef(dismiss);
	dismissRef.current = dismiss;

	const handleClick = useCallback(() => {
		open(tx.id);
	}, [open, tx.id]);

	const handleToastClose = useCallback(() => {
		if (programmaticDismissals.has(tx.id)) {
			programmaticDismissals.delete(tx.id);
			return;
		}
		activeToasts.delete(tx.id);
		dismissRef.current(tx.id);
	}, [tx.id]);

	useEffect(() => {
		const view = getToastView(tx, arrival);
		const toastType = view.outcome === "loading" ? "default" : view.outcome;
		const existingToast = activeToasts.get(tx.id);
		const showToast = shouldShowToast(tx.status);
		const autoClose = tx.status === "failed" ? 5_000 : false;

		if (showToast) {
			if (existingToast === undefined) {
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
				toast.update(existingToast, {
					render: <ToastContent tx={tx} view={view} onClick={handleClick} />,
					type: toastType,
					autoClose,
				});
			}
		}
	}, [tx, arrival, handleClick, handleToastClose]);

	useEffect(() => {
		return () => {
			const existingToast = activeToasts.get(tx.id);
			if (existingToast !== undefined) {
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
