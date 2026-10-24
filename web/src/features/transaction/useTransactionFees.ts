import { useCallback, useMemo } from "react";
import { useConvertedFee } from "../../hooks/useConvertedFee";
import { useEstimateFee } from "../../hooks/useEstimateFee";
import { useFeeToken } from "../../hooks/useFeeToken";
import { useNonce } from "../../hooks/useNonce";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import type { ChainId } from "../../registry/chains/types";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { AnyTransaction } from "../../types/transactions";
import { getFeeAssetLocation } from "../../utils/getFeeAssetLocation";
import { isBigInt } from "../../utils/isBigInt";
import { isNumber } from "../../utils/isNumber";
import type { TxOptionsWithChargeAssetTxPayment } from "../../utils/txOptions";

export const TX_MORTALITY_BLOCKS = 64;

type UseTransactionFeesProps = {
	signer: string | null | undefined;
	signerAddress: string | undefined;
	chainId: ChainId | null | undefined;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	isEthereumAccount: boolean;
	nativeToken: Token | null | undefined;
};

export const useTransactionFees = ({
	signer,
	signerAddress,
	chainId,
	call,
	fakeCall,
	isEthereumAccount,
	nativeToken,
}: UseTransactionFeesProps) => {
	const {
		resolvedAddress: signerSubstrateAddress,
		isLoading: isResolvingSigner,
	} = useResolvedSubstrateAddress({
		address: signerAddress,
		chainId,
	});

	const { data: nonce } = useNonce({
		account: signerSubstrateAddress,
		chainId,
	});

	const {
		feeToken: selectedFeeToken,
		feeTokens,
		isLoading: isLoadingFeeTokens,
		setFeeTokenId,
	} = useFeeToken({ accountId: signer, chainId });

	const feeToken = useMemo(
		() =>
			isEthereumAccount ? (nativeToken ?? selectedFeeToken) : selectedFeeToken,
		[isEthereumAccount, nativeToken, selectedFeeToken],
	);

	const options = useMemo<TxOptionsWithChargeAssetTxPayment | undefined>(() => {
		if (!isNumber(nonce) || !feeToken) return undefined;
		return {
			asset: getFeeAssetLocation(feeToken),
			mortality: { mortal: true, period: TX_MORTALITY_BLOCKS },
			nonce,
		};
	}, [feeToken, nonce]);

	const {
		data: feeEstimateNative,
		isLoading: isLoadingFeeEstimateNative,
		error: errorFeeEstimate,
	} = useEstimateFee({
		from: signerSubstrateAddress,
		call: call ?? fakeCall,
		options,
	});

	const { isLoading: isLoadingFeeEstimateConvert, data: convertedFee } =
		useConvertedFee({
			chainId,
			feeTokenId: feeToken?.id,
			nativeFee: feeEstimateNative,
		});
	const feeEstimate = isBigInt(feeEstimateNative) ? convertedFee : null;

	const isLoadingFeeEstimate = useMemo(
		() =>
			isLoadingFeeTokens ||
			isLoadingFeeEstimateNative ||
			isLoadingFeeEstimateConvert,
		[
			isLoadingFeeEstimateConvert,
			isLoadingFeeEstimateNative,
			isLoadingFeeTokens,
		],
	);

	const onFeeTokenChange = useCallback(
		(feeTokenId: TokenId) => {
			if (isEthereumAccount) return;
			setFeeTokenId(feeTokenId);
		},
		[isEthereumAccount, setFeeTokenId],
	);

	return {
		signerSubstrateAddress,
		isResolvingSigner,
		feeToken,
		feeTokens,
		isLoadingFeeTokens,
		onFeeTokenChange,
		feeEstimate,
		errorFeeEstimate,
		isLoadingFeeEstimate,
		options,
	};
};
