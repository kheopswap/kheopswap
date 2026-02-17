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
const LEGACY_STORAGE_KEY = "kheopswap::transactions::v1";

try {
	localStorage.removeItem(LEGACY_STORAGE_KEY);
} catch {
	// ignore localStorage access issues
}

// Main store
const transactionsSubject = new BehaviorSubject<
	Map<TransactionId, TransactionRecord>
>(new Map());

// Observables
export const transactions$ = transactionsSubject
	.asObservable()
	.pipe(map((m) => Array.from(m.values())));

// Track which transaction's modal is open (null = no modal open)
const openTransactionIdSubject = new BehaviorSubject<TransactionId | null>(
	null,
);
export const openTransactionId$ = openTransactionIdSubject.asObservable();

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
	// Close modal if this transaction's modal is open
	if (openTransactionIdSubject.getValue() === id) {
		openTransactionIdSubject.next(null);
	}
};

export const openTransactionModal = (id: TransactionId): void => {
	const transactions = transactionsSubject.getValue();
	// Only open if transaction exists
	if (transactions.has(id)) {
		openTransactionIdSubject.next(id);
	}
};

export const dismissTransaction = (id: TransactionId): void => {
	const transactions = new Map(transactionsSubject.getValue());
	transactions.delete(id);
	transactionsSubject.next(transactions);
	// Close modal if this transaction was open
	if (openTransactionIdSubject.getValue() === id) {
		openTransactionIdSubject.next(null);
	}
};

export const getOpenTransactionId = (): TransactionId | null => {
	return openTransactionIdSubject.getValue();
};

export const updateTransactionStatus = (
	id: TransactionId,
	status: TransactionStatus,
): void => {
	updateTransaction(id, { status });
};
