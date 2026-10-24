import type { TxEvent } from "polkadot-api";
import { useCallback } from "react";
import { catchError, type Observable, of } from "rxjs";
import { toHex } from "viem";
import type { WalletAccount } from "../../common/kheopskit";
import { isChainIdAssetHub } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import type { Token } from "../../registry/tokens/types";
import {
	addTransaction,
	appendTxEvent,
	minimizeTransaction,
	openTransactionModal,
} from "../../state/transactions/transactionStore";
import type { TransactionFollowUp } from "../../state/transactions/types";
import type { AnyTransaction } from "../../types/transactions";
import { formatTxError } from "../../utils/getErrorMessageFromTxEvents";
import { logger } from "../../utils/logger";
import { notifyError } from "../../utils/notifyError";
import { createEthereumTxObservable } from "./createEthereumTxObservable";
import { TX_MORTALITY_BLOCKS } from "./useTransactionFees";

const TX_UNCONFIRMED_MS = 10 * 60 * 1000;
const SLOWEST_BLOCK_TIME_MS = 12_000;
export const TX_EXPIRY_MS = TX_MORTALITY_BLOCKS * SLOWEST_BLOCK_TIME_MS;
export const TX_EXPIRED_MESSAGE =
	"Transaction was not finalized before it expired";

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

// Not tied to the component lifecycle so transactions survive navigation.
const subscribeTxEvents = (
	txId: string,
	txEvents$: Observable<TxEvent>,
	onSigned: () => void,
): void => {
	let isSigned = false;

	const cleanup = () => {
		clearTimeout(unconfirmedTimeout);
		clearTimeout(expiryTimeout);
		sub.unsubscribe();
	};

	const unconfirmedTimeout = setTimeout(() => {
		logger.warn("Transaction not finalized after 10 minutes", txId);
		appendTxEvent(txId, { type: "unconfirmed" });
	}, TX_UNCONFIRMED_MS);

	const expiryTimeout = setTimeout(() => {
		logger.warn("Transaction expired without finalized/error event", txId);
		appendTxEvent(txId, {
			type: "error",
			error: new Error(TX_EXPIRED_MESSAGE),
		});
		cleanup();
	}, TX_EXPIRY_MS);

	const sub = txEvents$
		.pipe(catchError((error) => of({ type: "error" as const, error })))
		.subscribe((x) => {
			logger.log("Transaction status update", x);

			if (!isSigned && x.type !== "error") {
				isSigned = true;
				onSigned();
			}

			appendTxEvent(txId, x);

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

				if (!isSigned && isUserRejected) minimizeTransaction(txId);

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
	followUp: TransactionFollowUp;
	transactionTitle: string;
	onReset: () => void;
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
	followUp,
	transactionTitle,
	onReset,
}: UseTransactionSubmitProps) => {
	const onSubmit = useCallback(async () => {
		try {
			logger.log("submit", { call });

			if (!call || !account || account.isPlaceholder) return;

			const txFeeToken = feeToken ?? nativeToken;
			if (!txFeeToken) return;

			const getTxEvents$ = async (): Promise<Observable<TxEvent> | null> => {
				if (account.platform !== "ethereum") {
					if (!feeEstimate || !options) return null;
					return call.createSubmitAndWatch(account.txCreator, options);
				}
				if (!isChainIdAssetHub(chainId)) {
					notifyError(`Ethereum accounts are not supported on ${chainId}`);
					return null;
				}
				if (isEthereumNetworkMismatch) {
					notifyError(
						`Wrong network selected. Expected chain ID ${targetEvmChainId}.`,
					);
					return null;
				}
				return createEthereumTxObservable({
					account,
					chainId,
					callData: toHex(await call.getEncodedData()),
				});
			};

			const txEvents$ = await getTxEvents$();
			if (!txEvents$) return;

			const txId = crypto.randomUUID();
			addTransaction({
				id: txId,
				createdAt: Date.now(),
				status: "pending",
				txEvents: [{ type: "pending" }],
				account,
				feeEstimate: feeEstimate ?? 0n,
				feeToken: txFeeToken,
				title: transactionTitle,
				...followUp,
			});
			openTransactionModal(txId);
			subscribeTxEvents(txId, txEvents$, onReset);
		} catch (err) {
			notifyError(err);
		}
	}, [
		account,
		call,
		chainId,
		feeEstimate,
		feeToken,
		followUp,
		isEthereumNetworkMismatch,
		nativeToken,
		onReset,
		options,
		targetEvmChainId,
		transactionTitle,
	]);

	return { onSubmit };
};
