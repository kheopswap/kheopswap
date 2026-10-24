import { BehaviorSubject, map } from "rxjs";
import type { FollowUpTxEvent } from "../../components/FollowUpModal";
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
} catch {}

const transactionsSubject = new BehaviorSubject<
	Map<TransactionId, TransactionRecord>
>(new Map());

export const transactions$ = transactionsSubject
	.asObservable()
	.pipe(map((m) => Array.from(m.values())));

const openTransactionIdSubject = new BehaviorSubject<TransactionId | null>(
	null,
);
export const openTransactionId$ = openTransactionIdSubject.asObservable();

const autoPrune = (
	transactions: Map<TransactionId, TransactionRecord>,
): void => {
	if (transactions.size <= MAX_TRANSACTIONS) return;

	const entries = Array.from(transactions.entries());
	entries.sort(([, a], [, b]) => a.createdAt - b.createdAt);

	for (const [id, tx] of entries) {
		if (transactions.size <= MAX_TRANSACTIONS) break;
		if (isTerminalStatus(tx.status)) {
			transactions.delete(id);
		}
	}
};

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
	if (openTransactionIdSubject.getValue() === id) {
		openTransactionIdSubject.next(null);
	}
};

export const openTransactionModal = (id: TransactionId): void => {
	const transactions = transactionsSubject.getValue();
	if (transactions.has(id)) {
		openTransactionIdSubject.next(id);
	}
};

export const dismissTransaction = (id: TransactionId): void => {
	const transactions = new Map(transactionsSubject.getValue());
	transactions.delete(id);
	transactionsSubject.next(transactions);
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
