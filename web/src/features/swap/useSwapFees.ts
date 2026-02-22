import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import { useAssetConvertPlancks } from "../../hooks/useAssetConvertPlancks";
import { useEstimateFee } from "../../hooks/useEstimateFee";
import { useFeeToken } from "../../hooks/useFeeToken";
import { useNativeToken } from "../../hooks/useNativeToken";
import { useNonce } from "../../hooks/useNonce";
import { useTokenChain } from "../../hooks/useTokenChain";
import type { Token, TokenId } from "../../registry/tokens/types";
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
	tokenIdIn: TokenId | undefined;
	tokenIn: Token | null | undefined;
	balanceIn: bigint | null | undefined;
	edTokenIn: bigint | null | undefined;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	setFormData: Dispatch<SetStateAction<SwapFormInputs>>;
};

export const useSwapFees = ({
	from,
	accountAddress,
	tokenIdIn,
	tokenIn,
	balanceIn,
	edTokenIn,
	call,
	fakeCall,
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

	const tokenChain = useTokenChain({ tokenId: tokenIdIn });
	const nativeToken = useNativeToken({ chain: tokenChain });

	const { isLoading: isLoadingFeeEstimateConvert, plancksOut: feeEstimate } =
		useAssetConvertPlancks({
			tokenIdIn: nativeToken?.id,
			tokenIdOut: feeToken?.id,
			plancks: feeEstimateNative,
		});

	const isLoadingFeeEstimate =
		isLoadingFeeToken ||
		isLoadingFeeEstimateNative ||
		isLoadingFeeEstimateConvert;

	const onMaxClick = useCallback(() => {
		if (tokenIn && balanceIn && isBigInt(edTokenIn) && isBigInt(feeEstimate)) {
			const plancks = getMaxSwapAmount(
				balanceIn,
				feeEstimate,
				edTokenIn,
				tokenIn.type === "native",
			);

			setFormData((prev) => ({
				...prev,
				amountIn: plancksToTokens(plancks, tokenIn.decimals),
			}));
		}
	}, [balanceIn, feeEstimate, edTokenIn, tokenIn, setFormData]);

	return {
		feeToken,
		isLoadingFeeToken,
		isLoadingFeeEstimate,
		onMaxClick,
	};
};
