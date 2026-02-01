import { provideContext } from "@kheopswap/react-utils";
import { getTokenId, parseTokenId, type TokenId } from "@kheopswap/registry";
import { setSetting } from "@kheopswap/settings";
import { isBigInt, isNumber, plancksToTokens } from "@kheopswap/utils";
import { useCallback, useEffect, useMemo } from "react";
import {
	useAssetConvertPlancks,
	useBalance,
	useCanAccountReceive,
	useEstimateFee,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	useNonce,
	useSetting,
	useToken,
	useTokenChain,
	useWalletAccount,
} from "src/hooks";
import { useRelayChains } from "src/state";
import { getFeeAssetLocation, getTxOptions } from "src/util";
import { useSwapComputation } from "./useSwapComputation";
import { useSwapExtrinsic } from "./useSwapExtrinsic";
import { useSwapFormData } from "./useSwapFormData";
import { useSwapInputs } from "./useSwapInputs";
import { useSwapTokens } from "./useSwapTokens";

/**
 * Main swap provider hook that orchestrates all swap functionality.
 *
 * Composed of smaller hooks:
 * - useSwapFormData: Form state management with URL persistence
 * - useSwapTokens: Available tokens filtering
 * - useSwapInputs: Input amount calculations with app commission
 * - useSwapComputation: Output amount calculations with AMM formula
 */
const useSwapProvider = () => {
	const { assetHub } = useRelayChains();
	const [formData, setFormData] = useSwapFormData();

	// Available tokens for swapping
	const { tokens, isLoadingTokens } = useSwapTokens();

	// Extract form values
	const { tokenIdIn, tokenIdOut, from } = useMemo(
		() => ({
			from: formData.from,
			tokenIdIn: formData.tokenIdIn as TokenId | undefined,
			tokenIdOut: formData.tokenIdOut as TokenId | undefined,
		}),
		[formData],
	);

	const account = useWalletAccount({ id: from });
	const [slippage, setSlippage] = useSetting("slippage");

	// Input calculations (app commission handling)
	const { swapPlancksIn, appCommission, totalIn, isValidAmountIn } =
		useSwapInputs({
			tokenIdIn,
			amountIn: formData.amountIn,
		});

	// Output calculations (AMM formula, price impact, slippage)
	const {
		swapPlancksOut,
		amountOut,
		minPlancksOut,
		protocolCommission,
		priceImpact,
		reserveIn,
		reserveOut,
		isLoadingReserves,
		isLoadingLpFee,
	} = useSwapComputation({
		tokenIdIn,
		tokenIdOut,
		swapPlancksIn,
		totalIn,
		slippage,
	});

	// Token data
	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });
	const { data: tokenOut } = useToken({ tokenId: tokenIdOut });

	// Balances
	const { data: balanceIn, isLoading: isLoadingBalanceIn } = useBalance({
		address: account?.address,
		tokenId: tokenIdIn,
	});

	const { data: balanceOut, isLoading: isLoadingBalanceOut } = useBalance({
		address: account?.address,
		tokenId: tokenIdOut,
	});

	// Loading state
	const isLoading = useMemo(
		() => isLoadingReserves || isLoadingLpFee || isLoadingBalanceIn,
		[isLoadingBalanceIn, isLoadingLpFee, isLoadingReserves],
	);

	const isLoadingAmountOut =
		!!swapPlancksIn && !!tokenIn && !!tokenOut && !swapPlancksOut && isLoading;

	// Validation
	const hasInsufficientBalance = useMemo(() => {
		return balanceIn === undefined || totalIn === null
			? false
			: balanceIn < totalIn;
	}, [balanceIn, totalIn]);

	const hasInsufficientLiquidity = useMemo(() => {
		return reserveIn === 0n && reserveOut === 0n;
	}, [reserveIn, reserveOut]);

	const isPoolNotFound = useMemo(
		() =>
			tokenIn && tokenOut && !reserveIn && !reserveOut && !isLoadingReserves,
		[tokenIn, tokenOut, reserveIn, reserveOut, isLoadingReserves],
	);

	const isValidInput = useMemo(() => {
		return account && tokenIn && tokenOut && !!totalIn;
	}, [account, tokenIn, tokenOut, totalIn]);

	const isValid = useMemo(() => {
		return (
			isValidInput &&
			!hasInsufficientBalance &&
			!hasInsufficientLiquidity &&
			!!swapPlancksOut
		);
	}, [
		isValidInput,
		hasInsufficientBalance,
		hasInsufficientLiquidity,
		swapPlancksOut,
	]);

	// Fee estimation
	const { data: edTokenIn } = useExistentialDeposit({ tokenId: tokenIdIn });

	const { feeToken, isLoading: isLoadingFeeToken } = useFeeToken({
		accountId: from,
		chainId: tokenIn?.chainId,
	});

	const { data: call } = useSwapExtrinsic({
		tokenIdIn,
		tokenIdOut,
		amountIn: swapPlancksIn,
		amountOutMin: minPlancksOut,
		dest: account?.address,
		appCommission,
	});

	// Fake call for fee estimation before user enters amount
	const { data: fakeCall } = useSwapExtrinsic({
		tokenIdIn,
		tokenIdOut,
		amountIn: tokenIn && edTokenIn,
		amountOutMin: 0n,
		dest: account?.address,
		appCommission: tokenIn && edTokenIn,
	});

	const { data: nonce } = useNonce({
		account: account?.address,
		chainId: assetHub.id,
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
			from: account?.address,
			call: call ?? fakeCall,
			options: txOptions,
		});

	const tokenChain = useTokenChain({ tokenId: formData.tokenIdIn as TokenId });
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

	// Reset tokens when chain changes
	useEffect(() => {
		if (!assetHub) return;

		const tokenInParsed = formData.tokenIdIn
			? parseTokenId(formData.tokenIdIn as TokenId)
			: null;
		const tokenOutParsed = formData.tokenIdOut
			? parseTokenId(formData.tokenIdOut as TokenId)
			: null;

		const isInvalidTokenIn =
			tokenInParsed?.chainId && tokenInParsed.chainId !== assetHub.id;
		const isInvalidTokenOut =
			tokenOutParsed?.chainId && tokenOutParsed.chainId !== assetHub.id;

		if (isInvalidTokenIn || isInvalidTokenOut) {
			const nativeTokenId = getTokenId({
				type: "native",
				chainId: assetHub.id,
			});
			setFormData((prev) => ({
				...prev,
				tokenIdIn: nativeTokenId,
				tokenIdOut: "",
			}));
		}
	}, [assetHub, formData.tokenIdIn, formData.tokenIdOut, setFormData]);

	// Recipient validation
	const { data: checkCanReceive, isLoading: isCheckingRecipient } =
		useCanAccountReceive({
			address: account?.address,
			tokenId: tokenIdOut,
			plancks: minPlancksOut,
		});

	const outputErrorMessage = useMemo(() => {
		if (checkCanReceive?.reason) return checkCanReceive.reason;
		if (hasInsufficientLiquidity) return "Insufficient liquidity";
		if (isPoolNotFound) return "Liquidity pool not found";
		return null;
	}, [hasInsufficientLiquidity, isPoolNotFound, checkCanReceive?.reason]);

	// Event handlers
	const onFromChange = useCallback(
		(accountId: string) => {
			setSetting("defaultAccountId", accountId);
			setFormData((prev) => ({ ...prev, from: accountId }));
		},
		[setFormData],
	);

	const onAmountInChange = useCallback(
		(amountIn: string) => {
			setFormData((prev) => ({ ...prev, amountIn }));
		},
		[setFormData],
	);

	const onTokenInChange = useCallback(
		(tokenId: TokenId) => {
			const nativeTokenId = getTokenId({
				type: "native",
				chainId: assetHub.id,
			});

			if (tokenId !== nativeTokenId)
				setFormData((prev) => ({
					...prev,
					tokenIdIn: tokenId,
					tokenIdOut: nativeTokenId,
				}));
			else if (tokenIdOut === nativeTokenId)
				setFormData((prev) => ({
					...prev,
					tokenIdIn: tokenId,
					tokenIdOut: prev.tokenIdIn,
				}));
			else
				setFormData((prev) => ({
					...prev,
					tokenIdIn: tokenId,
				}));
		},
		[assetHub.id, tokenIdOut, setFormData],
	);

	const onTokenOutChange = useCallback(
		(tokenId: TokenId) => {
			const nativeTokenId = getTokenId({
				type: "native",
				chainId: assetHub.id,
			});

			if (tokenId !== nativeTokenId)
				setFormData((prev) => ({
					...prev,
					tokenIdIn: nativeTokenId,
					tokenIdOut: tokenId,
				}));
			else if (tokenIdIn === nativeTokenId)
				setFormData((prev) => ({
					...prev,
					tokenIdIn: prev.tokenIdOut,
					tokenIdOut: tokenId,
				}));
			else
				setFormData((prev) => ({
					...prev,
					tokenIdOut: tokenId,
				}));
		},
		[assetHub.id, tokenIdIn, setFormData],
	);

	const onSwapTokens = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			tokenIdIn: prev.tokenIdOut,
			tokenIdOut: prev.tokenIdIn,
		}));
	}, [setFormData]);

	const onMaxClick = useCallback(() => {
		if (tokenIn && balanceIn && isBigInt(edTokenIn) && isBigInt(feeEstimate)) {
			let plancks = balanceIn;
			const fees = feeEstimate;
			const ed = edTokenIn;

			if (tokenIn.type === "native" && 2n * fees + ed <= plancks)
				plancks -= 2n * fees + ed;

			setFormData((prev) => ({
				...prev,
				amountIn: plancksToTokens(plancks, tokenIn.decimals),
			}));
		}
	}, [balanceIn, feeEstimate, edTokenIn, tokenIn, setFormData]);

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amountIn: "" }));
	}, [setFormData]);

	// Follow-up data for transaction summary
	const followUpData = useMemo(() => {
		return { slippage, tokenOut, minPlancksOut, swapPlancksOut };
	}, [minPlancksOut, slippage, swapPlancksOut, tokenOut]);

	return {
		// Form state
		formData,
		from,
		sender: account?.address,
		recipient: account?.address,

		// Tokens
		tokens,
		isLoadingTokens,
		tokenIn,
		tokenOut,

		// Amounts
		totalIn,
		amountOut,
		swapPlancksOut,
		minPlancksOut,

		// Reserves
		reserveIn,
		reserveOut,

		// Balances
		balanceIn,
		balanceOut,
		isLoadingBalanceIn,
		isLoadingBalanceOut,

		// Commissions
		appCommission,
		protocolCommission,
		priceImpact,

		// Slippage
		slippage,
		setSlippage,

		// Validation
		isValid,
		isValidAmountIn,
		hasInsufficientBalance,
		hasInsufficientLiquidity,
		isPoolNotFound,
		outputErrorMessage,

		// Loading states
		isLoading,
		isLoadingLpFee,
		isLoadingReserves,
		isLoadingAmountOut,
		isLoadingFeeToken,
		isLoadingFeeEstimate,

		// Transaction
		call: outputErrorMessage || isCheckingRecipient ? undefined : call,
		fakeCall,
		followUpData,

		// Event handlers
		onFromChange,
		onTokenInChange,
		onTokenOutChange,
		onSwapTokens,
		onMaxClick,
		onAmountInChange,
		onReset,
	};
};

export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
