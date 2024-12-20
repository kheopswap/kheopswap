import { useCallback, useEffect, useMemo, useState } from "react";

import type { SwapFormInputs } from "./schema";
import { useAssetConvertionLPFee } from "./useAssetConvertionLPFee";
import { useSwapExtrinsic } from "./useSwapExtrinsic";

import { APP_FEE_ADDRESS, APP_FEE_PERCENT } from "@kheopswap/constants";
import { type TokenId, getTokenId, parseTokenId } from "@kheopswap/registry";
import { setSetting } from "@kheopswap/settings";
import {
	isBigInt,
	isNumber,
	plancksToTokens,
	provideContext,
	tokensToPlancks,
} from "@kheopswap/utils";
import { isEqual, keyBy, values } from "lodash";
import { useLocation, useNavigate } from "react-router-dom";
import {
	useAssetConvertPlancks,
	useBalance,
	useCanAccountReceive,
	useEstimateFee,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	useNonce,
	usePoolReservesByTokenIds,
	usePoolSupplies,
	usePoolsByChainId,
	useSetting,
	useToken,
	useTokenChain,
	useTokensByChainId,
	useWalletAccount,
} from "src/hooks";
import { useRelayChains } from "src/state";
import { getFeeAssetLocation, getTxOptions } from "src/util";

const useFormData = () => {
	const { relay } = useRelayChains();
	const nativeToken = useNativeToken({ chain: relay });

	const location = useLocation();
	const navigate = useNavigate();

	const [defaultAccountId, setDefaultAccountId] =
		useSetting("defaultAccountId");

	// account won't be available on first render
	const account = useWalletAccount({ id: defaultAccountId });

	const defaultValues = useMemo<SwapFormInputs>(
		() => ({
			from: account?.id ?? "",
			to: "",
			tokenIdIn: nativeToken?.id ?? "",
			tokenIdOut: "",
			amountIn: "",
			...location.state,
		}),
		[account?.id, nativeToken?.id, location.state],
	);

	const [formData, setFormData] = useState<SwapFormInputs>(defaultValues);

	useEffect(() => {
		if (!isEqual(location.state, formData)) {
			navigate(location, { state: formData, replace: true });
		}
	}, [formData, location, navigate]);

	// account won't be available on first render
	useEffect(() => {
		if (!formData.from && defaultValues.from)
			setFormData((prev) => ({ ...prev, from: defaultValues.from }));
	}, [defaultValues.from, formData.from]);

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	return [formData, setFormData] as const;
};

type SwapInputsProps = {
	tokenIdIn: TokenId;
	amountIn: string;
};

const useSwapInputs = ({ tokenIdIn, amountIn }: SwapInputsProps) => {
	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });

	const [plancksIn, feeIn, totalIn, isValidAmountIn] = useMemo(() => {
		if (!amountIn || !tokenIn) return [null, null, null, true];
		try {
			const totalIn = tokensToPlancks(amountIn, tokenIn.decimals);

			const appCommissionPercent =
				!!APP_FEE_ADDRESS && !!APP_FEE_PERCENT ? APP_FEE_PERCENT : 0;
			// fee = 0.3% of totalIn
			const feeNum =
				totalIn * BigInt(Number(appCommissionPercent * 10000).toFixed());
			const fee = feeNum / 1000000n;
			const plancksIn = totalIn - fee;

			return [plancksIn, fee, totalIn, true];
		} catch (_err) {
			return [null, null, null, false];
		}
	}, [amountIn, tokenIn]);

	const { data: checkCanAccountReceive } = useCanAccountReceive({
		address: APP_FEE_ADDRESS,
		tokenId: tokenIdIn,
		plancks: feeIn,
	});

	const [swapPlancksIn, appCommission] = useMemo(() => {
		return checkCanAccountReceive?.canReceive
			? [plancksIn, feeIn]
			: [totalIn, 0n];
	}, [checkCanAccountReceive?.canReceive, feeIn, plancksIn, totalIn]);

	return { swapPlancksIn, appCommission, totalIn, isValidAmountIn };
};

const useSwapProvider = () => {
	const { assetHub } = useRelayChains();
	const [formData, setFormData] = useFormData();

	const { data: allTokens, isLoading: isLoadingAllTokens } = useTokensByChainId(
		{
			chainId: assetHub.id,
		},
	);
	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const pairs = useMemo(() => pools?.map((p) => p.tokenIds) ?? [], [pools]);

	const { data: poolSupplies } = usePoolSupplies({ pairs });

	const [tokens, isLoadingTokens] = useMemo(() => {
		const swappableAssetIds =
			pools
				?.filter((p) => {
					const supplyState = poolSupplies.find(
						(s) =>
							s.pair.includes(p.tokenIds[0]) && s.pair.includes(p.tokenIds[1]),
					);
					return !!supplyState?.supply;
				})
				.flatMap((p) => p.tokenIds) ?? [];
		return [
			keyBy(
				values(allTokens).filter(
					(t) => t.type === "native" || swappableAssetIds.includes(t.id),
				) ?? [],
				"id",
			),
			isLoadingAllTokens ||
				isLoadingPools ||
				poolSupplies.some((s) => s.isLoading),
		];
	}, [allTokens, isLoadingAllTokens, isLoadingPools, poolSupplies, pools]);

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

	const { data: reserves, isLoading: isLoadingReserves } =
		usePoolReservesByTokenIds({
			tokenId1: tokenIdIn,
			tokenId2: tokenIdOut,
		});

	const { data: lpFee, isLoading: isLoadingLpFee } = useAssetConvertionLPFee({
		chain: assetHub,
	});

	const { data: balanceIn, isLoading: isLoadingBalanceIn } = useBalance({
		address: account?.address,
		tokenId: tokenIdIn,
	});
	const { data: balanceOut, isLoading: isLoadingBalanceOut } = useBalance({
		address: account?.address,
		tokenId: tokenIdOut,
	});

	// if we got these 3, everything else can be derived
	const isLoading = useMemo(
		() => isLoadingReserves || isLoadingLpFee || isLoadingBalanceIn,
		[isLoadingBalanceIn, isLoadingLpFee, isLoadingReserves],
	);

	const [reserveIn, reserveOut] = useMemo(
		() => reserves ?? [undefined, undefined],
		[reserves],
	);

	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });
	const { data: tokenOut } = useToken({ tokenId: tokenIdOut });

	const { swapPlancksIn, appCommission, totalIn, isValidAmountIn } =
		useSwapInputs(formData);

	const [swapPlancksOut, protocolCommission] = useMemo(() => {
		// https://github.com/paritytech/substrate/blob/e076bdad1fefb5a0e2461acf7e2cab1192f3c9f3/frame/asset-conversion/src/lib.rs#L1108
		if (!lpFee || !reserveIn || !reserveOut || !swapPlancksIn)
			return [undefined, undefined];

		const safeMultiplier = 1000n;

		if (reserveIn === 0n || reserveOut === 0n) throw new Error("No liquidity");

		const amountInWithFee = swapPlancksIn * (safeMultiplier - BigInt(lpFee));
		const protocolCommission =
			(safeMultiplier * swapPlancksIn - amountInWithFee) / safeMultiplier;
		const numerator = amountInWithFee * reserveOut;
		const denominator = reserveIn * safeMultiplier + amountInWithFee;
		const plancksOut = numerator / denominator;
		return [plancksOut, protocolCommission];
	}, [lpFee, swapPlancksIn, reserveIn, reserveOut]);

	const amountOut = useMemo(() => {
		if (!swapPlancksOut || !tokenOut) return "";
		return plancksToTokens(swapPlancksOut, tokenOut.decimals);
	}, [swapPlancksOut, tokenOut]);

	const isLoadingAmountOut =
		!!swapPlancksIn && !!tokenIn && !!tokenOut && !swapPlancksOut && isLoading;

	const { plancksOut: rawPlancksOut } = useAssetConvertPlancks({
		tokenIdIn,
		tokenIdOut,
		plancks: totalIn,
	});

	const priceImpact = useMemo(() => {
		// ratio difference between rawplancksout and swapplancksout
		if (!rawPlancksOut || !swapPlancksOut) return undefined;

		return (
			-Number((10000n * (rawPlancksOut - swapPlancksOut)) / rawPlancksOut) /
			10000
		);
	}, [rawPlancksOut, swapPlancksOut]);

	const minPlancksOut = useMemo(() => {
		if (!swapPlancksOut || slippage === undefined) return null;
		const safetyDecimal = 10000n;
		return (
			(swapPlancksOut *
				(safetyDecimal - BigInt(slippage * Number(safetyDecimal)))) /
			safetyDecimal
		);
	}, [swapPlancksOut, slippage]);

	const hasInsufficientBalance = useMemo(() => {
		return balanceIn === undefined || totalIn === null
			? false
			: balanceIn < totalIn;
	}, [balanceIn, totalIn]);

	const hasInsufficientLiquidity = useMemo(() => {
		return reserveIn === 0n && reserveOut === 0n;
	}, [reserveIn, reserveOut]);

	const isPoolNotFound = useMemo(
		() => tokenIn && tokenOut && !reserves && !isLoadingReserves,
		[tokenIn, tokenOut, reserves, isLoadingReserves],
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

	const { data: edTokenIn } = useExistentialDeposit({
		tokenId: tokenIdIn,
	});

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

	// fake call for fee estimation up front
	const { data: fakeCall } = useSwapExtrinsic({
		tokenIdIn,
		tokenIdOut,
		amountIn: tokenIn && edTokenIn, // arbitrary amount
		amountOutMin: 0n,
		dest: account?.address,
		appCommission: tokenIn && edTokenIn, // arbitrary amount
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

	useEffect(() => {
		// if user changes chain, reset tokens
		if (!assetHub) return;

		const tokenIn = formData.tokenIdIn
			? parseTokenId(formData.tokenIdIn as TokenId)
			: null;
		const tokenOut = formData.tokenIdOut
			? parseTokenId(formData.tokenIdOut as TokenId)
			: null;

		const isInvalidTokenIn =
			tokenIn?.chainId && tokenIn.chainId !== assetHub.id;
		const isInvalidTokenOut =
			tokenOut?.chainId && tokenOut.chainId !== assetHub.id;

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
	}, [assetHub, formData, setFormData]);

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

	const followUpData = useMemo(() => {
		return { slippage, tokenOut, minPlancksOut, swapPlancksOut };
	}, [minPlancksOut, slippage, swapPlancksOut, tokenOut]);

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

	const onTokenInChange = (tokenId: TokenId) => {
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
				tokenIdOut: formData.tokenIdIn,
			}));
		else
			setFormData((prev) => ({
				...prev,
				tokenIdIn: tokenId,
			}));
	};

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

	const res = {
		formData,
		from,
		sender: account?.address,
		recipient: account?.address, // TODO
		amountOut,
		isLoadingLpFee,
		isLoadingReserves,
		isLoading,
		swapPlancksOut,
		totalIn,
		minPlancksOut,
		tokens,
		isLoadingTokens,
		isLoadingBalanceIn,
		isLoadingBalanceOut,
		isLoadingAmountOut,
		tokenIn,
		tokenOut,
		slippage,
		balanceIn,
		balanceOut,
		isValid,
		isValidAmountIn,
		hasInsufficientBalance,
		hasInsufficientLiquidity,
		call: outputErrorMessage || isCheckingRecipient ? undefined : call,
		fakeCall: fakeCall,
		isLoadingFeeToken,
		isLoadingFeeEstimate,
		isPoolNotFound,
		priceImpact,
		reserveIn,
		reserveOut,
		appCommission,
		protocolCommission,
		outputErrorMessage,
		followUpData,

		setSlippage,
		onFromChange,
		onTokenInChange,
		onTokenOutChange,
		onSwapTokens,
		onMaxClick,
		onAmountInChange,
		onReset,
	};

	return res;
};

export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
