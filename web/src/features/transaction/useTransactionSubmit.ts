import type { WalletAccount } from "@kheopskit/core";
import type { TxEvent } from "polkadot-api";
import { useCallback } from "react";
import { catchError, type Observable, of, shareReplay } from "rxjs";
import { toHex } from "viem";
import type { ChainId } from "../../registry/chains/types";
import type { Token } from "../../registry/tokens/types";
import {
	addTransaction,
	appendTxEvent,
	minimizeTransaction,
	openTransactionModal,
	updateTransactionStatus,
} from "../../state/transactions/transactionStore";
import type { TransactionType } from "../../state/transactions/types";
import type { AnyTransaction } from "../../types/transactions";
import { formatTxError } from "../../utils/getErrorMessageFromTxEvents";
import { logger } from "../../utils/logger";
import { notifyError } from "../../utils/notifyError";
import { createEthereumTxObservable } from "./createEthereumTxObservable";

const TX_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const isUserRejectedTxError = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null) return false;

	if ("code" in error) {
		const code = (error as { code?: unknown }).code;
		if (code === 4001 || code === "ACTION_REJECTED") return true;
	}

	if ("name" in error) {
		const name = (error as { name?: unknown }).name;
		if (typeof name === "string" && name.includes("Rejected")) return true;
	}

	if ("message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") {
			const normalized = message.toLowerCase();
			if (
				normalized.includes("user rejected") ||
				normalized.includes("user denied") ||
				normalized.includes("cancelled") ||
				normalized.includes("canceled")
			) {
				return true;
			}
		}
	}

	return false;
};

/**
 * Subscribes to a transaction Observable and feeds events to the transaction store.
 * Used by both Polkadot and Ethereum transaction flows.
 *
 * The subscription self-terminates when a "finalized" or "error" event is received.
 * A safety timeout (10 minutes) ensures the subscription is cleaned up if neither
 * event arrives (e.g. due to a dropped connection).
 *
 * It is intentionally not tied to component lifecycle so transactions survive navigation.
 */
const subscribeTxEvents = (
	txId: string,
	txEvents$: Observable<TxEvent>,
): void => {
	let isSubmitted = false;

	const obs$ = txEvents$.pipe(
		catchError((error) => of({ type: "error" as const, error })),
		shareReplay(1),
	);

	const cleanup = () => {
		clearTimeout(safetyTimeout);
		sub.unsubscribe();
	};

	const safetyTimeout = setTimeout(() => {
		logger.warn("Transaction timed out without finalized/error event", txId);
		updateTransactionStatus(txId, "failed");
		sub.unsubscribe();
	}, TX_TIMEOUT_MS);

	const sub = obs$.subscribe((x) => {
		logger.log("Transaction status update", x);

		if (x.type === "broadcasted") isSubmitted = true;

		if (x.type !== "error") {
			appendTxEvent(txId, x);
		}

		if (x.type === "finalized") cleanup();

		if (x.type === "error") {
			logger.error("Transaction error", x.error);
			const err = x.error;
			const isUserRejected = isUserRejectedTxError(err);
			const hasNestedError =
				typeof err === "object" && err !== null && "error" in err;
			const errorMessage = hasNestedError
				? formatTxError((err as { error: unknown }).error)
				: "";

			if (errorMessage === "Unknown: CannotLookup")
				console.warn(
					"It could be that the chain doesn't support CheckMetadataHash",
				);

			if (!isSubmitted) {
				appendTxEvent(txId, x);
				updateTransactionStatus(txId, "failed");
				if (isUserRejected) {
					minimizeTransaction(txId);
				}
			} else {
				appendTxEvent(txId, x);
			}

			cleanup();
		}
	});
};

type UseTransactionSubmitProps = {
	account: WalletAccount | null;
	call: AnyTransaction | null | undefined;
	chainId: ChainId | null | undefined;
	feeEstimate: bigint | null | undefined;
	feeToken: Token | null | undefined;
	nativeToken: Token | null | undefined;
	options: object | undefined;
	isEthereumNetworkMismatch: boolean;
	targetEvmChainId: number | undefined;
	transactionType: TransactionType;
	transactionTitle: string;
	followUpData: Record<string, unknown>;
};

export const useTransactionSubmit = ({
	account,
	call,
	chainId,
	feeEstimate,
	feeToken,
	nativeToken,
	options,
	isEthereumNetworkMismatch,
	targetEvmChainId,
	transactionType,
	transactionTitle,
	followUpData,
}: UseTransactionSubmitProps) => {
	const onSubmit = useCallback(async () => {
		try {
			logger.log("submit", { call });

			if (!call || !account) return;

			const txFeeToken = feeToken ?? nativeToken;
			if (!txFeeToken) return;

			const txId = crypto.randomUUID();

			addTransaction({
				id: txId,
				createdAt: Date.now(),
				status: "pending",
				txEvents: [{ type: "pending" }],
				account,
				feeEstimate: feeEstimate ?? 0n,
				feeToken: txFeeToken,
				type: transactionType,
				title: transactionTitle,
				followUpData,
			});

			openTransactionModal(txId);

			let txEvents$: Observable<TxEvent>;

			if (account.platform === "ethereum") {
				if (isEthereumNetworkMismatch) {
					updateTransactionStatus(txId, "failed");
					notifyError(
						`Wrong network selected. Expected chain ID ${targetEvmChainId}.`,
					);
					return;
				}

				const encodedCallData = await call.getEncodedData();
				const callData = toHex(encodedCallData);

				txEvents$ = createEthereumTxObservable({
					account,
					chainId: chainId as ChainId,
					callData,
				});
			} else {
				if (!feeEstimate || !options) return;
				txEvents$ = call.signSubmitAndWatch(account.polkadotSigner, options);
			}

			// Fire-and-forget: subscription self-terminates on finalized/error.
			subscribeTxEvents(txId, txEvents$);
		} catch (err) {
			notifyError(err);
		}
	}, [
		account,
		call,
		chainId,
		feeEstimate,
		feeToken,
		followUpData,
		isEthereumNetworkMismatch,
		nativeToken,
		options,
		targetEvmChainId,
		transactionType,
		transactionTitle,
	]);

	return { onSubmit };
};
