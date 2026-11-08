import type { SS58String, TxEvent } from "polkadot-api";
import { useCallback } from "react";
import { catchError, type Observable, of, shareReplay } from "rxjs";
import { toHex } from "viem";
import type { WalletAccount } from "../../common/kheopskit";
import type { FollowUpTxEvent } from "../../components/FollowUpModal";
import { getApi } from "../../papi/getApi";
import { isChainIdAssetHub } from "../../registry/chains/chains";
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
import type { TxOptionsWithChargeAssetTxPayment } from "../../utils/getTxOptions";
import { isNumber } from "../../utils/isNumber";
import { logger } from "../../utils/logger";
import { notifyError } from "../../utils/notifyError";
import { createEthereumTxObservable } from "./createEthereumTxObservable";

const TX_UNCONFIRMED_MS = 10 * 60 * 1000;

type Submission = {
	txId: string;
	chainId: ChainId;
	signer: SS58String;
	nonce: number | null;
};

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

const hasFinalizedNonceMoved = async ({
	txId,
	chainId,
	signer,
	nonce,
}: Submission): Promise<boolean> => {
	if (nonce === null) return false;
	try {
		const api = await getApi(chainId);
		const account = await api.query.System.Account.getValue(signer, {
			at: "finalized",
		});
		return account.nonce > nonce;
	} catch (error) {
		logger.warn("Could not read the nonce of an unconfirmed transaction", {
			txId,
			error,
		});
		return false;
	}
};

const subscribeTxEvents = (
	submission: Submission,
	txEvents$: Observable<TxEvent>,
	onSigned: () => void,
): void => {
	const { txId } = submission;
	let isSigned = false;
	let isSubmitted = false;
	let latest: FollowUpTxEvent["type"] = "pending";

	const obs$ = txEvents$.pipe(
		catchError((error) => of({ type: "error" as const, error })),
		shareReplay(1),
	);

	const record = (event: FollowUpTxEvent) => {
		latest = event.type;
		appendTxEvent(txId, event);
	};

	let unconfirmedTimeout: ReturnType<typeof setTimeout> | undefined;

	const cleanup = () => {
		clearTimeout(unconfirmedTimeout);
		sub.unsubscribe();
	};

	const isAwaitingInclusion = () =>
		latest === "broadcasted" || latest === "notInBestBlock";

	const startUnconfirmedTimeout = () => {
		unconfirmedTimeout = setTimeout(async () => {
			if (!isAwaitingInclusion()) return;
			logger.warn("Transaction not confirmed after 10 minutes", txId);
			record({ type: "unconfirmed" });
			if (
				(await hasFinalizedNonceMoved(submission)) &&
				latest === "unconfirmed"
			)
				record({ type: "lostTrack" });
		}, TX_UNCONFIRMED_MS);
	};

	const sub = obs$.subscribe((x) => {
		logger.log("Transaction status update", x);

		if (x.type === "broadcasted") isSubmitted = true;
		if (x.type === "broadcasted" || x.type === "notInBestBlock") {
			clearTimeout(unconfirmedTimeout);
			startUnconfirmedTimeout();
		}

		if (x.type !== "error") {
			if (!isSigned) {
				isSigned = true;
				onSigned();
			}
			record(x);
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
				record(x);
				updateTransactionStatus(txId, "failed");
				if (isUserRejected) {
					minimizeTransaction(txId);
				}
			} else {
				record(x);
			}

			cleanup();
		}
	});
};

type UseTransactionSubmitProps = {
	account: WalletAccount | null;
	signerAddress: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
	chainId: ChainId | null | undefined;
	feeEstimate: bigint | null | undefined;
	feeToken: Token | null | undefined;
	nativeToken: Token | null | undefined;
	options: TxOptionsWithChargeAssetTxPayment | undefined;
	isEthereumNetworkMismatch: boolean;
	targetEvmChainId: number | undefined;
	transactionType: TransactionType;
	transactionTitle: string;
	followUpData: Record<string, unknown>;
	onReset: () => void;
};

export const useTransactionSubmit = ({
	account,
	signerAddress,
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
	onReset,
}: UseTransactionSubmitProps) => {
	const onSubmit = useCallback(async () => {
		try {
			logger.log("submit", { call });

			if (!call || !account || account.isPlaceholder) return;
			if (!chainId || !signerAddress || !options || !isNumber(options.nonce))
				return;
			const nonce = account.platform === "ethereum" ? null : options.nonce;

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
				if (!isChainIdAssetHub(chainId)) {
					updateTransactionStatus(txId, "failed");
					notifyError(`Ethereum accounts are not supported on ${chainId}`);
					return;
				}

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
					chainId,
					callData,
				});
			} else {
				if (!feeEstimate || !options) return;
				txEvents$ = call.createSubmitAndWatch(account.txCreator, options);
			}

			subscribeTxEvents(
				{ txId, chainId, signer: signerAddress, nonce },
				txEvents$,
				onReset,
			);
		} catch (err) {
			notifyError(err);
		}
	}, [
		account,
		signerAddress,
		call,
		chainId,
		feeEstimate,
		feeToken,
		followUpData,
		isEthereumNetworkMismatch,
		nativeToken,
		onReset,
		options,
		targetEvmChainId,
		transactionType,
		transactionTitle,
	]);

	return { onSubmit };
};
