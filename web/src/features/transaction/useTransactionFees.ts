import { useCallback, useMemo } from "react";
import { useAssetConvertPlancks } from "../../hooks/useAssetConvertPlancks";
import { useDryRun } from "../../hooks/useDryRun";
import { useEstimateFee } from "../../hooks/useEstimateFee";
import { useFeeToken } from "../../hooks/useFeeToken";
import { useNonce } from "../../hooks/useNonce";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import type { ChainId } from "../../registry/chains/types";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { AnyTransaction } from "../../types/transactions";
import { getFeeAssetLocation } from "../../utils/getFeeAssetLocation";
import { getTxOptions } from "../../utils/getTxOptions";
import { isNumber } from "../../utils/isNumber";

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

	const options = useMemo(() => {
		if (!isNumber(nonce) || !feeToken) return undefined;
		return getTxOptions({
			asset: feeToken ? getFeeAssetLocation(feeToken) : undefined,
			mortality: { mortal: true, period: 64 },
			nonce,
		});
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

	const { isLoading: isLoadingFeeEstimateConvert, plancksOut: feeEstimate } =
		useAssetConvertPlancks({
			tokenIdIn: nativeToken?.id,
			tokenIdOut: feeToken?.id,
			plancks: feeEstimateNative,
		});

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

	const {
		data: dryRun,
		isLoading: isLoadingDryRun,
		error: errorDryRun,
	} = useDryRun({
		chainId,
		from: signerSubstrateAddress,
		call,
	});

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
		dryRun,
		isLoadingDryRun,
		errorDryRun,
	};
};
