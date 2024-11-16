import { useCallback, useEffect, useMemo, useState } from "react";

import type { TeleportFormInputs } from "./schema";
import { useTeleportExtrinsic } from "./useTeleportExtrinsic";

import { type TokenId, getTokenId, parseTokenId } from "@kheopswap/registry";
import { setSetting } from "@kheopswap/settings";
import {
	getAddressFromAccountField,
	plancksToTokens,
	provideContext,
	tokensToPlancks,
} from "@kheopswap/utils";
import { keyBy } from "lodash";
import {
	useBalance,
	useCanAccountReceive,
	useEstimateFee,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	useSetting,
	useToken,
	useWalletAccount,
} from "src/hooks";
import { useEstimateDeliveryFee } from "src/hooks";
import { useEstimateDestinationFee } from "src/hooks";
import { useRelayChains } from "src/state";
import { getAssetHubMirrorTokenId } from "src/util";

const useDefaultValues = () => {
	const [defaultAccountId] = useSetting("defaultAccountId");
	const account = useWalletAccount({ id: defaultAccountId });

	const { relay, assetHub } = useRelayChains();

	const relayNativeToken = useNativeToken({ chain: relay });
	const assetHubNativeToken = useNativeToken({ chain: assetHub });

	return useMemo<TeleportFormInputs>(
		() => ({
			from: account?.id ?? "",
			to: "", // if empty it should fallback to sender
			tokenIdIn: relayNativeToken?.id ?? "",
			tokenIdOut: assetHubNativeToken?.id ?? "",
			amountIn: "",
		}),
		[account?.id, assetHubNativeToken?.id, relayNativeToken?.id],
	);
};

const useTeleportProvider = () => {
	const defaultValues = useDefaultValues();
	const [, setDefaultAccountId] = useSetting("defaultAccountId");
	const [formData, setFormData] = useState<TeleportFormInputs>(defaultValues);
	const { relay, assetHub, allChains } = useRelayChains();

	const relayNativeToken = useNativeToken({ chain: relay });
	const assetHubNativeToken = useNativeToken({ chain: assetHub });

	// TODO para to para & relay to paras other than asset hub
	const tokens = useMemo(
		() => keyBy([relayNativeToken, assetHubNativeToken], "id"),
		[relayNativeToken, assetHubNativeToken],
	);

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	useEffect(() => {
		if (!formData.from && defaultValues.from)
			setFormData((prev) => ({ ...prev, from: defaultValues.from }));
	}, [defaultValues.from, formData.from]);

	useEffect(() => {
		// if user changes chain, reset tokens
		if (
			!allChains ||
			!relay ||
			!assetHub ||
			!formData.tokenIdIn ||
			!formData.tokenIdOut
		)
			return;

		const allChainIds = allChains.map((c) => c.id);
		const tokenIn = parseTokenId(formData.tokenIdIn as TokenId);
		const tokenOut = parseTokenId(formData.tokenIdOut as TokenId);

		const isInvalidTokenIn =
			tokenIn.chainId && !allChainIds.includes(tokenIn.chainId);
		const isInvalidTokenOut =
			tokenOut.chainId && !allChainIds.includes(tokenOut.chainId);

		if (isInvalidTokenIn || isInvalidTokenOut) {
			const nativeRelayTokenId = getTokenId({
				type: "native",
				chainId: relay.id,
			});
			const nativeAssetHubTokenId = getTokenId({
				type: "native",
				chainId: assetHub.id,
			});
			setFormData((prev) => ({
				...prev,
				tokenIdIn: nativeRelayTokenId,
				tokenIdOut: nativeAssetHubTokenId,
			}));
		}
	}, [allChains, assetHub, formData, relay]);

	const [tokenIn, tokenOut] = useMemo(() => {
		const tokenIn = tokens[formData.tokenIdIn];
		const tokenOut = tokens[formData.tokenIdOut];
		return [tokenIn, tokenOut];
	}, [formData.tokenIdIn, formData.tokenIdOut, tokens]);

	const plancksIn = useMemo(() => {
		try {
			return formData.amountIn && tokenIn
				? tokensToPlancks(formData.amountIn, tokenIn.decimals)
				: null;
		} catch (_err) {
			// invalid amount
			return null;
		}
	}, [formData.amountIn, tokenIn]);

	const account = useWalletAccount({ id: formData.from });

	const sender = useMemo(() => account?.address ?? null, [account?.address]);

	const recipient = useMemo(
		() => getAddressFromAccountField(formData.to) ?? sender,
		[formData.to, sender],
	);

	const { data: extrinsic } = useTeleportExtrinsic({
		tokenIdIn: tokenIn?.id,
		tokenIdOut: tokenOut?.id,
		plancksIn,
		recipient,
	});

	const { data: existentialDepositIn } = useExistentialDeposit({
		tokenId: tokenIn?.id,
	});

	const { data: fakeExtrinsic } = useTeleportExtrinsic({
		tokenIdIn: tokenIn?.id,
		tokenIdOut: tokenOut?.id,
		plancksIn: existentialDepositIn ?? null,
		recipient,
	});

	const {
		data: deliveryFeeEstimate,
		isLoading: isLoadingDeliveryFeeEstimate,
		error: errorDeliveryFeeEstimate,
	} = useEstimateDeliveryFee({
		call: extrinsic?.call ?? fakeExtrinsic?.call,
		chainId: tokenIn?.chainId,
		from: account?.address,
	});

	const {
		data: destFeeEstimate,
		isLoading: isLoadingDestFeeEstimate,
		error: errorDestFeeEstimate,
	} = useEstimateDestinationFee({
		call: extrinsic?.call ?? fakeExtrinsic?.call,
		chainId: tokenIn?.chainId,
		from: account?.address,
	});

	const destFeeToken = useToken({ tokenId: destFeeEstimate?.tokenId });

	const [plancksOut, amountOut] = useMemo(() => {
		// assume target token is same value as source
		// fee token might be different

		if (!plancksIn || !destFeeEstimate || !destFeeToken)
			return [null, null] as const;

		if (
			getAssetHubMirrorTokenId(tokenIn.id) ===
			getAssetHubMirrorTokenId(tokenOut.id)
		) {
			if (plancksIn <= destFeeEstimate.plancks) return [null, null] as const;
			const plancksOut = plancksIn - destFeeEstimate.plancks;
			return [plancksOut, plancksToTokens(plancksOut, tokenOut.decimals)] as [
				bigint,
				string,
			];
		}

		return [plancksIn, formData.amountIn] as [bigint, string];
	}, [
		formData.amountIn,
		plancksIn,
		destFeeEstimate,
		destFeeToken,
		tokenIn,
		tokenOut,
	]);

	const { feeToken } = useFeeToken({
		chainId: tokenIn?.chainId,
		accountId: sender,
	});

	const { data: feeEstimate } = useEstimateFee({
		from: sender,
		call: extrinsic?.call ?? fakeExtrinsic?.call,
	});

	const { data: balanceIn, isLoading: isLoadingBalanceIn } = useBalance({
		address: sender,
		tokenId: tokenIn?.id,
	});
	const { data: balanceOut, isLoading: isLoadingBalanceOut } = useBalance({
		address: sender,
		tokenId: tokenOut?.id,
	});

	const { data: checkCanAccountReceive } = useCanAccountReceive({
		address: recipient,
		tokenId: tokenOut?.id,
		plancks: plancksOut,
	});

	const outputErrorMessage = useMemo(
		() => checkCanAccountReceive?.reason,
		[checkCanAccountReceive?.reason],
	);

	const onFromChange = useCallback((accountId: string) => {
		setSetting("defaultAccountId", accountId);
		setFormData((prev) => ({ ...prev, from: accountId }));
	}, []);

	const onTokenInChange = useCallback((tokenId: TokenId) => {
		setFormData((prev) => ({
			...prev,
			tokenIdIn: tokenId,
			tokenIdOut:
				prev.tokenIdOut === tokenId ? prev.tokenIdIn : prev.tokenIdOut,
		}));
	}, []);

	const onTokenOutChange = useCallback((tokenId: TokenId) => {
		setFormData((prev) => ({
			...prev,
			tokenIdOut: tokenId,
			tokenIdIn: prev.tokenIdOut === tokenId ? prev.tokenIdIn : prev.tokenIdOut,
		}));
	}, []);

	const onSwapTokens = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			tokenIdIn: prev.tokenIdOut,
			tokenIdOut: prev.tokenIdIn,
		}));
	}, []);

	const onMaxClick = useCallback(() => {
		if (tokenIn && balanceIn && feeToken && deliveryFeeEstimate) {
			let plancks = balanceIn;
			const fees = feeToken.id === tokenIn.id ? (feeEstimate ?? 0n) : 0n;
			const deliveryFees =
				deliveryFeeEstimate.tokenId === tokenIn.id
					? (deliveryFeeEstimate.plancks ?? 0n)
					: 0n;
			const ed = existentialDepositIn ?? 0n;

			const total = fees + deliveryFees + ed;

			if (tokenIn.type === "native" && plancks >= total) plancks -= total;

			setFormData((prev) => ({
				...prev,
				amountIn: plancksToTokens(plancks, tokenIn.decimals),
			}));
		}
	}, [
		tokenIn,
		balanceIn,
		feeToken,
		feeEstimate,
		deliveryFeeEstimate,
		existentialDepositIn,
	]);

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amountIn: "" }));
	}, []);

	const onAmountInChange = useCallback((amountIn: string) => {
		setFormData((prev) => ({ ...prev, amountIn }));
	}, []);

	return {
		formData,
		sender,
		recipient,
		tokenIn,
		tokenOut,
		plancksIn,
		tokens,
		isLoadingTokens: false,
		plancksOut,
		amountOut,
		balanceIn,
		balanceOut,
		isLoadingBalanceIn,
		isLoadingBalanceOut,
		destFeeEstimate,
		isLoadingDestFeeEstimate,
		errorDestFeeEstimate,
		deliveryFeeEstimate,
		isLoadingDeliveryFeeEstimate,
		errorDeliveryFeeEstimate,
		call:
			outputErrorMessage || !checkCanAccountReceive?.canReceive
				? undefined
				: extrinsic?.call,
		fakeCall: fakeExtrinsic?.call,
		outputErrorMessage,
		onFromChange,
		onAmountInChange,
		onTokenInChange,
		onTokenOutChange,
		onSwapTokens,
		onMaxClick,
		onReset,
	};
};

export const [TeleportProvider, useTeleport] =
	provideContext(useTeleportProvider);
