import { bind } from "@react-rxjs/core";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
} from "react";
import { combineLatest, map, shareReplay } from "rxjs";
import {
	dismissTransaction,
	getOpenTransactionId,
	minimizeTransaction,
	openTransactionId$,
	openTransactionModal,
	transactions$,
} from "./transactionStore";
import type { TransactionId, TransactionRecord } from "./types";

// Observables for reactive updates
const openTransaction$ = combineLatest([
	transactions$,
	openTransactionId$,
]).pipe(
	map(
		([txs, openId]) =>
			(openId ? txs.find((tx) => tx.id === openId) : null) ?? null,
	),
	shareReplay({ bufferSize: 1, refCount: true }),
);

// bind() returns a hook that already handles subscriptions internally
const [useAllTransactions] = bind(transactions$, [] as TransactionRecord[]);

const [useOpenTransaction] = bind(
	openTransaction$,
	null as TransactionRecord | null,
);

type TransactionsContextValue = {
	transactions: TransactionRecord[];
	openTransaction: TransactionRecord | null;
	minimize: (id: TransactionId) => void;
	open: (id: TransactionId) => void;
	dismiss: (id: TransactionId) => void;
	closeModal: (id: TransactionId) => void; // Close modal, minimize if pending or dismiss if terminal
};

const TransactionsContext = createContext<TransactionsContextValue | null>(
	null,
);

export const TransactionsProvider: FC<PropsWithChildren> = ({ children }) => {
	const transactions = useAllTransactions();
	const openTransaction = useOpenTransaction();

	const minimize = useCallback((id: TransactionId) => {
		minimizeTransaction(id);
	}, []);

	const open = useCallback((id: TransactionId) => {
		openTransactionModal(id);
	}, []);

	const dismiss = useCallback((id: TransactionId) => {
		dismissTransaction(id);
	}, []);

	const closeModal = useCallback(
		(id: TransactionId) => {
			const openId = getOpenTransactionId();
			if (openId !== id) return;

			const tx = transactions.find((t) => t.id === id);
			if (!tx) return;

			// If finalized or failed, dismiss entirely (no toast)
			// Otherwise, just close modal (toast stays)
			if (tx.status === "finalized" || tx.status === "failed") {
				dismissTransaction(id);
			} else {
				minimizeTransaction(id);
			}
		},
		[transactions],
	);

	const value = useMemo<TransactionsContextValue>(
		() => ({
			transactions,
			openTransaction,
			minimize,
			open,
			dismiss,
			closeModal,
		}),
		[transactions, openTransaction, minimize, open, dismiss, closeModal],
	);

	return (
		<TransactionsContext.Provider value={value}>
			{children}
		</TransactionsContext.Provider>
	);
};

export const useTransactions = (): TransactionsContextValue => {
	const context = useContext(TransactionsContext);
	if (!context) {
		throw new Error("useTransactions must be used within TransactionsProvider");
	}
	return context;
};
