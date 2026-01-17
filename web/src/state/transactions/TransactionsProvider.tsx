import { bind } from "@react-rxjs/core";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
} from "react";
import { map } from "rxjs";
import {
	dismissTransaction,
	getOpenTransaction,
	minimizeTransaction,
	openTransactionModal,
	transactions$,
} from "./transactionStore";
import type { TransactionId, TransactionRecord } from "./types";

// React-rxjs bindings for reactive updates
const [useAllTransactions] = bind(transactions$, []);

const [useOpenTransaction] = bind(
	transactions$.pipe(map((txs) => txs.find((tx) => !tx.isMinimized) ?? null)),
	null,
);

const [useMinimizedTransactions] = bind(
	transactions$.pipe(map((txs) => txs.filter((tx) => tx.isMinimized))),
	[],
);

type TransactionsContextValue = {
	transactions: TransactionRecord[];
	openTransaction: TransactionRecord | null;
	minimizedTransactions: TransactionRecord[];
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
	const minimizedTransactions = useMinimizedTransactions();

	const minimize = useCallback((id: TransactionId) => {
		minimizeTransaction(id);
	}, []);

	const open = useCallback((id: TransactionId) => {
		openTransactionModal(id);
	}, []);

	const dismiss = useCallback((id: TransactionId) => {
		dismissTransaction(id);
	}, []);

	const closeModal = useCallback((id: TransactionId) => {
		const tx = getOpenTransaction();
		if (!tx || tx.id !== id) return;

		// If finalized or failed, dismiss entirely (no toast)
		// Otherwise, minimize to toast
		if (tx.status === "finalized" || tx.status === "failed") {
			dismissTransaction(id);
		} else {
			minimizeTransaction(id);
		}
	}, []);

	const value = useMemo<TransactionsContextValue>(
		() => ({
			transactions,
			openTransaction,
			minimizedTransactions,
			minimize,
			open,
			dismiss,
			closeModal,
		}),
		[
			transactions,
			openTransaction,
			minimizedTransactions,
			minimize,
			open,
			dismiss,
			closeModal,
		],
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
