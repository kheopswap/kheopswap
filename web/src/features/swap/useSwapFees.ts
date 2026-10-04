import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import { useConvertedFee } from "../../hooks/useConvertedFee";
import { useEstimateFee } from "../../hooks/useEstimateFee";
import { useFeeToken } from "../../hooks/useFeeToken";
import { useNonce } from "../../hooks/useNonce";
import type { Token, TokenAmount } from "../../registry/tokens/types";
import type { AnyTransaction } from "../../types/transactions";
import { getMaxSwapAmount } from "../../utils/ammMath";
import { getFeeAssetLocation } from "../../utils/getFeeAssetLocation";
import { getTxOptions } from "../../utils/getTxOptions";
import { isBigInt } from "../../utils/isBigInt";
import { isNumber } from "../../utils/isNumber";
import { plancksToTokens } from "../../utils/plancks";
import type { SwapFormInputs } from "./schema";

type UseSwapFeesProps = {
	from: string | undefined;
	accountAddress: string | undefined;
	tokenIn: Token | null | undefined;
	balanceIn: bigint | null | undefined;
	edTokenIn: bigint | null | undefined;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	deliveryFee: TokenAmount | undefined;
	setFormData: Dispatch<SetStateAction<SwapFormInputs>>;
};

export const useSwapFees = ({
	from,
	accountAddress,
	tokenIn,
	balanceIn,
	edTokenIn,
	call,
	fakeCall,
	deliveryFee,
	setFormData,
}: UseSwapFeesProps) => {
	const { feeToken, isLoading: isLoadingFeeToken } = useFeeToken({
		accountId: from,
		chainId: tokenIn?.chainId,
	});

	const { data: nonce } = useNonce({
		account: accountAddress,
		chainId: tokenIn?.chainId,
	});

	const txOptions = useMemo(() => {
		if (!isNumber(nonce) || !feeToken) return undefined;
		return getTxOptions({
			asset: feeToken ? getFeeAssetLocation(feeToken) : undefined,
			mortality: { mortal: true, period: 64 },
			nonce,
		});
	}, [feeToken, nonce]);

	const { data: feeEstimateNative, isLoading: isLoadingFeeEstimateNative } =
		useEstimateFee({
			from: accountAddress,
			call: call ?? fakeCall,
			options: txOptions,
		});

	const { isLoading: isLoadingFeeEstimateConvert, data: feeEstimate } =
		useConvertedFee({
			chainId: tokenIn?.chainId,
			feeTokenId: feeToken?.id,
			nativeFee: feeEstimateNative,
		});

	const isLoadingFeeEstimate =
		isLoadingFeeToken ||
		isLoadingFeeEstimateNative ||
		isLoadingFeeEstimateConvert;

	const onMaxClick = useCallback(() => {
		if (
			tokenIn &&
			feeToken &&
			balanceIn &&
			isBigInt(edTokenIn) &&
			isBigInt(feeEstimate)
		) {
			const plancks = getMaxSwapAmount({
				balance: balanceIn,
				tokenIn,
				existentialDeposit: edTokenIn,
				fee: { tokenId: feeToken.id, plancks: feeEstimate },
				deliveryFee,
			});

			setFormData((prev) => ({
				...prev,
				amountIn: plancksToTokens(plancks, tokenIn.decimals),
			}));
		}
	}, [
		balanceIn,
		feeEstimate,
		feeToken,
		edTokenIn,
		tokenIn,
		deliveryFee,
		setFormData,
	]);

	return {
		feeToken,
		isLoadingFeeToken,
		isLoadingFeeEstimate,
		onMaxClick,
	};
};
