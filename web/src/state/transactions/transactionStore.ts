import { getLocalStorageKey } from "@kheopswap/utils";
import { BehaviorSubject, map } from "rxjs";
import type { FollowUpTxEvent } from "src/components";
import {
	getStatusFromEvent,
	isTerminalStatus,
	type TransactionId,
	type TransactionRecord,
	type TransactionStatus,
} from "./types";

const MAX_TRANSACTIONS = 20;
const STORAGE_KEY = getLocalStorageKey("transactions::v1");

// Only persist completed transactions (for history)
// Active transactions with observables cannot be serialized
const loadPersistedTransactions = (): Map<TransactionId, TransactionRecord> => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return new Map();

		const parsed = JSON.parse(stored, (_key, value) => {
			// Restore bigint values
			if (typeof value === "string" && value.startsWith("bigint:")) {
				return BigInt(value.slice(7));
			}
			return value;
		}) as Array<[TransactionId, TransactionRecord]>;

		return new Map(parsed);
	} catch {
		return new Map();
	}
};

const persistTransactions = (
	transactions: Map<TransactionId, TransactionRecord>,
): void => {
	try {
		// Only persist terminal transactions
		const toStore = Array.from(transactions.entries()).filter(([, tx]) =>
			isTerminalStatus(tx.status),
		);

		const serialized = JSON.stringify(toStore, (_, value) => {
			if (typeof value === "bigint") {
				return `bigint:${value.toString()}`;
			}
			return value;
		});

		localStorage.setItem(STORAGE_KEY, serialized);
	} catch (err) {
		console.error("Failed to persist transactions", err);
	}
};

// Initialize store with persisted data
const initialTransactions = loadPersistedTransactions();

// Main store
const transactionsSubject = new BehaviorSubject<
	Map<TransactionId, TransactionRecord>
>(initialTransactions);

// Auto-persist on changes (debounced would be better but keeping simple)
transactionsSubject.subscribe((transactions) => {
	persistTransactions(transactions);
});

// Observables
export const transactions$ = transactionsSubject
	.asObservable()
	.pipe(map((m) => Array.from(m.values())));

export const getTransaction = (
	id: TransactionId,
): TransactionRecord | undefined => {
	return transactionsSubject.getValue().get(id);
};

export const getTransactionById$ = (id: TransactionId) =>
	transactionsSubject.asObservable().pipe(map((m) => m.get(id)));

// Auto-prune: remove oldest terminal transactions when exceeding limit
const autoPrune = (
	transactions: Map<TransactionId, TransactionRecord>,
): void => {
	if (transactions.size <= MAX_TRANSACTIONS) return;

	const entries = Array.from(transactions.entries());
	// Sort by createdAt ascending (oldest first)
	entries.sort(([, a], [, b]) => a.createdAt - b.createdAt);

	// Find terminal transactions to remove
	for (const [id, tx] of entries) {
		if (transactions.size <= MAX_TRANSACTIONS) break;
		if (isTerminalStatus(tx.status)) {
			transactions.delete(id);
		}
	}
};

// Mutations
export const addTransaction = (transaction: TransactionRecord): void => {
	const transactions = new Map(transactionsSubject.getValue());
	transactions.set(transaction.id, transaction);
	autoPrune(transactions);
	transactionsSubject.next(transactions);
};

export const updateTransaction = (
	id: TransactionId,
	updates: Partial<TransactionRecord>,
): void => {
	const transactions = new Map(transactionsSubject.getValue());
	const existing = transactions.get(id);
	if (existing) {
		transactions.set(id, { ...existing, ...updates });
		transactionsSubject.next(transactions);
	}
};

export const appendTxEvent = (
	id: TransactionId,
	event: FollowUpTxEvent,
): void => {
	const transactions = new Map(transactionsSubject.getValue());
	const existing = transactions.get(id);
	if (existing) {
		const txEvents = [...existing.txEvents, event];
		const status = getStatusFromEvent(event);

		// Extract txHash if available
		let txHash = existing.txHash;
		if ("txHash" in event && typeof event.txHash === "string" && event.txHash) {
			txHash = event.txHash;
		}

		transactions.set(id, {
			...existing,
			txEvents,
			status,
			txHash,
		});
		transactionsSubject.next(transactions);
	}
};

export const minimizeTransaction = (id: TransactionId): void => {
	updateTransaction(id, { isMinimized: true });
};

export const openTransactionModal = (id: TransactionId): void => {
	const transactions = new Map(transactionsSubject.getValue());

	// Minimize any currently open transaction first
	for (const [txId, tx] of transactions) {
		if (!tx.isMinimized && txId !== id) {
			transactions.set(txId, { ...tx, isMinimized: true });
		}
	}

	// Open the target transaction
	const target = transactions.get(id);
	if (target) {
		transactions.set(id, { ...target, isMinimized: false });
	}

	transactionsSubject.next(transactions);
};

export const dismissTransaction = (id: TransactionId): void => {
	const transactions = new Map(transactionsSubject.getValue());
	transactions.delete(id);
	transactionsSubject.next(transactions);
};

export const getOpenTransaction = (): TransactionRecord | undefined => {
	const transactions = transactionsSubject.getValue();
	for (const tx of transactions.values()) {
		if (!tx.isMinimized) return tx;
	}
	return undefined;
};

export const getMinimizedTransactions = (): TransactionRecord[] => {
	const transactions = transactionsSubject.getValue();
	return Array.from(transactions.values()).filter((tx) => tx.isMinimized);
};

export const updateTransactionStatus = (
	id: TransactionId,
	status: TransactionStatus,
): void => {
	updateTransaction(id, { status });
};
