import type { SS58String, TxEvent } from "polkadot-api";
import { useCallback } from "react";
import { firstValueFrom, type Observable } from "rxjs";
import { toHex } from "viem";
import type { WalletAccount } from "../../common/kheopskit";
import { getApi } from "../../papi/getApi";
import { isChainIdAssetHub } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import type { Token } from "../../registry/tokens/types";
import {
	addTransaction,
	openTransactionModal,
} from "../../state/transactions/transactionStore";
import type { TransactionFollowUp } from "../../state/transactions/types";
import type { AnyTransaction } from "../../types/transactions";
import { isNumber } from "../../utils/isNumber";
import { logger } from "../../utils/logger";
import { notifyError } from "../../utils/notifyError";
import type { TxOptionsWithChargeAssetTxPayment } from "../../utils/txOptions";
import { createEthereumTxObservable } from "./createEthereumTxObservable";
import { followTransaction } from "./followTransaction";
import { TX_MORTALITY_BLOCKS } from "./useTransactionFees";

type Submitted = { txEvents$: Observable<TxEvent>; death: number | null };

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
	followUp: TransactionFollowUp;
	transactionTitle: string;
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
	followUp,
	transactionTitle,
	onReset,
}: UseTransactionSubmitProps) => {
	const onSubmit = useCallback(async () => {
		try {
			logger.log("submit", { call });

			if (!call || !account || account.isPlaceholder || !chainId) return;
			if (!options || !isNumber(options.nonce) || !signerAddress) return;
			const { nonce } = options;

			const txFeeToken = feeToken ?? nativeToken;
			if (!txFeeToken) return;

			const submit = async (): Promise<Submitted | null> => {
				if (account.platform !== "ethereum") {
					if (!feeEstimate) return null;
					const api = await getApi(chainId);
					const { block } = await firstValueFrom(
						api.query.System.Number.watchValue({ at: "finalized" }),
					);
					return {
						txEvents$: call.createSubmitAndWatch(account.txCreator, {
							...options,
							mortality: {
								mortal: true,
								period: TX_MORTALITY_BLOCKS,
								at: { hash: block.hash, number: block.number },
							},
						}),
						death: block.number + TX_MORTALITY_BLOCKS,
					};
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
				return {
					txEvents$: createEthereumTxObservable({
						account,
						chainId,
						callData: toHex(await call.getEncodedData()),
					}),
					death: null,
				};
			};

			const submitted = await submit();
			if (!submitted) return;

			const txId = crypto.randomUUID();
			addTransaction({
				id: txId,
				createdAt: Date.now(),
				status: "pending",
				txEvents: [{ type: "pending" }],
				account,
				nonce,
				feeEstimate: feeEstimate ?? 0n,
				feeToken: txFeeToken,
				title: transactionTitle,
				...followUp,
			});
			openTransactionModal(txId);
			followTransaction(
				{ txId, chainId, signer: signerAddress, nonce, death: submitted.death },
				submitted.txEvents$,
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
