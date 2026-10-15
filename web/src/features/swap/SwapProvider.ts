import { useMemo } from "react";
import { useAllTokens } from "../../hooks/useAllTokens";
import { useBalance } from "../../hooks/useBalance";
import { useToken } from "../../hooks/useToken";
import { provideContext } from "../../utils/provideContext";
import { getSwapTokenLists, type TransactionPlan } from "./routes/swapRoute";
import {
	useXcmRoute,
	type XcmSwapDetails,
	type XcmTransferDetails,
} from "./routes/xcm/useXcmRoute";
import { useSwapCall } from "./useSwapCall";
import { useSwapFees } from "./useSwapFees";
import { useSwapFormState } from "./useSwapFormState";
import { useSwapPricing } from "./useSwapPricing";

export type AmmSwapDetails = {
	kind: "amm-swap";
	reserveIn: bigint | undefined;
	reserveOut: bigint | undefined;
	isPoolNotFound: boolean | null | undefined;
	priceImpact: number | undefined;
	minPlancksOut: bigint | null;
	slippage: number;
	appCommission: bigint | null | undefined;
	protocolCommission: bigint | undefined;
};

const getSwapTitle = (
	tokenInSymbol: string | undefined,
	tokenOutSymbol: string | undefined,
): string => {
	if (tokenInSymbol && tokenOutSymbol) {
		return `Swap ${tokenInSymbol}/${tokenOutSymbol}`;
	}
	return "Swap";
};

const OPEN_SUBMIT_GATE = { status: "open" } as const;

const useSwapProvider = () => {
	const formState = useSwapFormState();
	const { route } = formState;
	const ammRoute = route?.kind === "amm-swap" ? route : null;
	const xcmRoute = route && route.kind !== "amm-swap" ? route : null;
	const isTokenIdOutAmm =
		!!ammRoute || !formState.tokenIdIn || !formState.tokenIdOut;

	const pricing = useSwapPricing({
		tokenIdIn: formState.tokenIdIn,
		tokenIdOut: isTokenIdOutAmm ? formState.tokenIdOut : undefined,
		amountIn: formState.formData.amountIn,
		accountAddress: formState.account?.address,
	});

	const callData = useSwapCall({
		tokenIdIn: formState.tokenIdIn,
		tokenIdOut: ammRoute?.tokenIdOut,
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

	const { data: tokenOut } = useToken({ tokenId: formState.tokenIdOut });
	const { data: balanceOut, isLoading: isLoadingBalanceOut } = useBalance({
		address: formState.account?.address,
		tokenId: formState.tokenIdOut,
	});

	const xcm = useXcmRoute({
		route: xcmRoute,
		account: formState.account,
		tokenIn: pricing.tokenIn,
		tokenOut,
		totalIn: pricing.totalIn,
		swapPlancksIn: pricing.swapPlancksIn,
		appCommission: pricing.appCommission,
		slippage: pricing.slippage,
		edTokenIn: pricing.edTokenIn,
	});

	const ammTransaction = useMemo<TransactionPlan>(
		() => ({
			chainId: pricing.tokenIn?.chainId,
			call:
				pricing.outputErrorMessage || pricing.isCheckingRecipient
					? undefined
					: callData.call,
			fakeCall: callData.fakeCall,
			callSpendings:
				pricing.tokenIn && pricing.totalIn
					? {
							[pricing.tokenIn.id]: {
								plancks: pricing.totalIn,
								allowDeath: true,
							},
						}
					: {},
			followUpData: callData.followUpData,
			transactionType: "swap",
			title: getSwapTitle(pricing.tokenIn?.symbol, pricing.tokenOut?.symbol),
			submitGate: OPEN_SUBMIT_GATE,
		}),
		[
			pricing.tokenIn,
			pricing.tokenOut?.symbol,
			pricing.totalIn,
			pricing.outputErrorMessage,
			pricing.isCheckingRecipient,
			callData.call,
			callData.fakeCall,
			callData.followUpData,
		],
	);

	const transaction = xcmRoute ? xcm.plan : ammTransaction;

	const { onMaxClick } = useSwapFees({
		from: formState.from,
		accountAddress: formState.account?.address,
		tokenIdIn: formState.tokenIdIn,
		tokenIn: pricing.tokenIn,
		balanceIn: pricing.balanceIn,
		edTokenIn: pricing.edTokenIn,
		call: xcmRoute ? xcm.plan.call : callData.call,
		fakeCall: transaction.fakeCall,
		extraNativeSpending: xcmRoute ? xcm.quote.deliveryFee : undefined,
		setFormData: formState.setFormData,
	});

	const { data: allTokens, isLoading: isLoadingAllTokens } = useAllTokens({});
	const { tokensIn, tokensOut } = useMemo(
		() =>
			getSwapTokenLists({
				ammTokens: pricing.tokens,
				allTokens,
				mirrors: formState.mirrors,
			}),
		[pricing.tokens, allTokens, formState.mirrors],
	);

	const details = useMemo<AmmSwapDetails | XcmTransferDetails | XcmSwapDetails>(
		() =>
			xcm.details ?? {
				kind: "amm-swap",
				reserveIn: pricing.reserveIn,
				reserveOut: pricing.reserveOut,
				isPoolNotFound: pricing.isPoolNotFound,
				priceImpact: pricing.priceImpact,
				minPlancksOut: pricing.minPlancksOut,
				slippage: pricing.slippage,
				appCommission: pricing.appCommission,
				protocolCommission: pricing.protocolCommission,
			},
		[
			xcm.details,
			pricing.reserveIn,
			pricing.reserveOut,
			pricing.isPoolNotFound,
			pricing.priceImpact,
			pricing.minPlancksOut,
			pricing.slippage,
			pricing.appCommission,
			pricing.protocolCommission,
		],
	);

	const outputErrorMessage = isTokenIdOutAmm
		? pricing.outputErrorMessage
		: xcmRoute
			? xcm.outputErrorMessage
			: "Route not available";

	return {
		formData: formState.formData,
		from: formState.from,
		route,
		canFlip: formState.canFlip,
		tokensIn,
		tokensOut,
		isLoadingTokens: pricing.isLoadingTokens || isLoadingAllTokens,
		tokenIn: pricing.tokenIn,
		tokenOut,
		totalIn: pricing.totalIn,
		balanceIn: pricing.balanceIn,
		balanceOut,
		isLoadingBalanceIn: pricing.isLoadingBalanceIn,
		isLoadingBalanceOut,
		swapPlancksOut: xcmRoute ? xcm.swapPlancksOut : pricing.swapPlancksOut,
		amountOut: xcmRoute ? xcm.amountOut : pricing.amountOut,
		isLoadingAmountOut: xcmRoute
			? xcm.isLoadingAmountOut
			: pricing.isLoadingAmountOut,
		outputErrorMessage,
		details,
		transaction,

		onFromChange: formState.onFromChange,
		onTokenInChange: formState.onTokenInChange,
		onTokenOutChange: formState.onTokenOutChange,
		onSwapTokens: formState.onSwapTokens,
		onMaxClick,
		onAmountInChange: formState.onAmountInChange,
		onReset: formState.onReset,
	};
};

export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
