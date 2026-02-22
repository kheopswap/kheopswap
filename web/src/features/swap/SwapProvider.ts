import { useMemo } from "react";
import { provideContext } from "../../utils/provideContext";
import { useSwapCall } from "./useSwapCall";
import { useSwapFees } from "./useSwapFees";
import { useSwapFormState } from "./useSwapFormState";
import { useSwapPricing } from "./useSwapPricing";

const useSwapProvider = () => {
	// 1. Form state & persistence
	const formState = useSwapFormState();

	// 2. Pricing, AMM math & validation
	const pricing = useSwapPricing({
		tokenIdIn: formState.tokenIdIn,
		tokenIdOut: formState.tokenIdOut,
		amountIn: formState.formData.amountIn,
		accountAddress: formState.account?.address,
	});

	// 3. Transaction payload assembly
	const callData = useSwapCall({
		tokenIdIn: formState.tokenIdIn,
		tokenIdOut: formState.tokenIdOut,
		swapPlancksIn: pricing.swapPlancksIn,
		minPlancksOut: pricing.minPlancksOut,
		dest: formState.resolvedSubstrateAddress,
		appCommission: pricing.appCommission,
		tokenIn: pricing.tokenIn,
		edTokenIn: pricing.edTokenIn,
		slippage: pricing.slippage,
		tokenOut: pricing.tokenOut,
		swapPlancksOut: pricing.swapPlancksOut,
	});

	// 4. Fee estimation & max click
	const fees = useSwapFees({
		from: formState.from,
		accountAddress: formState.account?.address,
		tokenIdIn: formState.tokenIdIn,
		tokenIn: pricing.tokenIn,
		balanceIn: pricing.balanceIn,
		edTokenIn: pricing.edTokenIn,
		call: callData.call,
		fakeCall: callData.fakeCall,
		setFormData: formState.setFormData,
	});

	// Cross-concern: validity depends on form + pricing
	const isValidInput = useMemo(() => {
		return (
			formState.account &&
			pricing.tokenIn &&
			pricing.tokenOut &&
			!!pricing.totalIn
		);
	}, [formState.account, pricing.tokenIn, pricing.tokenOut, pricing.totalIn]);

	const isValid = useMemo(() => {
		return (
			isValidInput &&
			!pricing.hasInsufficientBalance &&
			!pricing.hasInsufficientLiquidity &&
			!!pricing.swapPlancksOut
		);
	}, [
		isValidInput,
		pricing.hasInsufficientBalance,
		pricing.hasInsufficientLiquidity,
		pricing.swapPlancksOut,
	]);

	return {
		formData: formState.formData,
		from: formState.from,
		sender: formState.account?.address,
		recipient: formState.account?.address, // TODO
		amountOut: pricing.amountOut,
		isLoadingLpFee: pricing.isLoadingLpFee,
		isLoadingReserves: pricing.isLoadingReserves,
		isLoading: pricing.isLoading,
		swapPlancksOut: pricing.swapPlancksOut,
		totalIn: pricing.totalIn,
		minPlancksOut: pricing.minPlancksOut,
		tokens: pricing.tokens,
		isLoadingTokens: pricing.isLoadingTokens,
		isLoadingBalanceIn: pricing.isLoadingBalanceIn,
		isLoadingBalanceOut: pricing.isLoadingBalanceOut,
		isLoadingAmountOut: pricing.isLoadingAmountOut,
		tokenIn: pricing.tokenIn,
		tokenOut: pricing.tokenOut,
		slippage: pricing.slippage,
		balanceIn: pricing.balanceIn,
		balanceOut: pricing.balanceOut,
		isValid,
		isValidAmountIn: pricing.isValidAmountIn,
		hasInsufficientBalance: pricing.hasInsufficientBalance,
		hasInsufficientLiquidity: pricing.hasInsufficientLiquidity,
		call:
			pricing.outputErrorMessage || pricing.isCheckingRecipient
				? undefined
				: callData.call,
		fakeCall: callData.fakeCall,
		isLoadingFeeToken: fees.isLoadingFeeToken,
		isLoadingFeeEstimate: fees.isLoadingFeeEstimate,
		isPoolNotFound: pricing.isPoolNotFound,
		priceImpact: pricing.priceImpact,
		reserveIn: pricing.reserveIn,
		reserveOut: pricing.reserveOut,
		appCommission: pricing.appCommission,
		protocolCommission: pricing.protocolCommission,
		outputErrorMessage: pricing.outputErrorMessage,
		followUpData: callData.followUpData,

		setSlippage: pricing.setSlippage,
		onFromChange: formState.onFromChange,
		onTokenInChange: formState.onTokenInChange,
		onTokenOutChange: formState.onTokenOutChange,
		onSwapTokens: formState.onSwapTokens,
		onMaxClick: fees.onMaxClick,
		onAmountInChange: formState.onAmountInChange,
		onReset: formState.onReset,
	};
};

export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
