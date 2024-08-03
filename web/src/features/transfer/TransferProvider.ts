import { useCallback, useEffect, useMemo, useState } from "react";

import type { TransferFormInputs } from "./schema";
import { useTransferExtrinsic } from "./useTransferExtrinsic";

import { TRANSFERABLE_TOKEN_TYPES, type TokenId } from "src/config/tokens";
import {
	useAllTokens,
	useAssetConvertPlancks,
	useBalance,
	useEstimateFee,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	useNonce,
	useRelayChains,
	useSetting,
	useTokenChain,
	useWalletAccount,
} from "src/hooks";
import {
	getAddressFromAccountField,
	getFeeAssetLocation,
	isNumber,
	plancksToTokens,
	provideContext,
	tokensToPlancks,
} from "src/util";
import { getTxOptions } from "src/util/getTxOptions";

const useDefaultValues = () => {
	const [defaultAccountId] = useSetting("defaultAccountId");

	// account won't be available on first render
	const account = useWalletAccount({ id: defaultAccountId });

	// TODO token id from url for deep links, maybe recipient too

	const { relay } = useRelayChains();
	const nativeToken = useNativeToken({ chain: relay });

	return useMemo<TransferFormInputs>(
		() => ({
			from: account?.id ?? "",
			tokenId: nativeToken?.id ?? "",
			amount: "",
			to: "",
		}),
		[account?.id, nativeToken?.id],
	);
};

const useTransferProvider = () => {
	const defaultValues = useDefaultValues();
	const [formData, setFormData] = useState<TransferFormInputs>(defaultValues);

	const [, setDefaultAccountId] = useSetting("defaultAccountId");
	const { relay } = useRelayChains();
	const defaultToken = useNativeToken({ chain: relay });

	const { data: tokens, isLoading: isLoadingTokens } = useAllTokens({
		types: TRANSFERABLE_TOKEN_TYPES,
	});

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	useEffect(() => {
		if (!formData.from && defaultValues.from)
			setFormData((prev) => ({ ...prev, from: defaultValues.from }));
	}, [defaultValues.from, formData.from]);

	const sender = useMemo(
		() => getAddressFromAccountField(formData.from),
		[formData.from],
	);

	const recipient = useMemo(
		() => getAddressFromAccountField(formData.to),
		[formData.to],
	);

	const token = useMemo(
		() => tokens.find((t) => t.id === formData.tokenId) ?? null,
		[formData.tokenId, tokens],
	);
	const tokenChain = useTokenChain({ tokenId: formData.tokenId as TokenId });

	const nativeToken = useNativeToken({ chain: tokenChain });

	const { feeToken } = useFeeToken({
		chainId: tokenChain?.id,
		accountId: sender,
	});

	// if relay changes, use it's native token as default
	useEffect(() => {
		if (tokenChain?.relay !== relay.id && defaultToken) {
			setFormData((prev) => ({
				...prev,
				tokenId: defaultToken.id,
			}));
		}
	}, [defaultToken, relay.id, tokenChain?.relay]);

	const [
		plancks,
		//  isValidAmount
	] = useMemo(() => {
		try {
			return formData.amount && token
				? [tokensToPlancks(formData.amount, token.decimals), true]
				: [null, true];
		} catch (err) {
			// invalid amount
			return [null, false];
		}
	}, [formData.amount, token]);

	// TODO handle is loading
	const { data: edTokenIn } = useExistentialDeposit({
		tokenId: token?.id,
	});

	const { data: call } = useTransferExtrinsic({
		tokenId: token?.id,
		plancks,
		recipient,
	});

	const { data: fakeCall } = useTransferExtrinsic({
		tokenId: token?.id,
		plancks: edTokenIn ?? null,
		recipient: recipient ?? sender,
	});

	const { data: nonce } = useNonce({
		account: sender,
		chainId: tokenChain?.id,
	});

	const txOptions = useMemo(() => {
		if (!isNumber(nonce) || !feeToken) return undefined;
		return getTxOptions({
			asset: feeToken ? getFeeAssetLocation(feeToken) : undefined,
			mortality: { mortal: true, period: 64 },
			nonce,
		});
	}, [feeToken, nonce]);

	const { data: feeEstimateNative } = useEstimateFee({
		from: sender,
		call: call ?? fakeCall,
		options: txOptions,
	});

	const { plancksOut: feeEstimate } = useAssetConvertPlancks({
		tokenIdIn: nativeToken?.id,
		tokenIdOut: feeToken?.id,
		plancks: feeEstimateNative,
	});

	const { data: balanceSender, isLoading: isLoadingBalanceSender } = useBalance(
		{
			address: sender,
			tokenId: token?.id,
		},
	);

	const { data: balanceRecipient } = useBalance({
		address: recipient,
		tokenId: token?.id,
	});

	const onTokenChange = useCallback((tokenId: TokenId) => {
		setFormData((prev) => ({ ...prev, tokenId }));
	}, []);

	const onFromChange = useCallback((accountId: string) => {
		setFormData((prev) => ({ ...prev, from: accountId }));
	}, []);

	const onToChange = useCallback((address: string) => {
		setFormData((prev) => ({ ...prev, to: address }));
	}, []);

	const onAmountChange = useCallback((amount: string) => {
		setFormData((prev) => ({ ...prev, amount }));
	}, []);

	const onMaxClick = useCallback(() => {
		if (token && balanceSender) {
			let plancks = balanceSender;

			const nativeMargin =
				2n * (feeToken?.id === token?.id ? feeEstimate ?? 0n : 0n) +
				(edTokenIn ?? 0n);

			if (token.type === "native" && nativeMargin <= plancks)
				plancks = plancks - nativeMargin;

			setFormData((prev) => ({
				...prev,
				amount: plancksToTokens(plancks, token.decimals),
			}));
		}
	}, [balanceSender, edTokenIn, feeEstimate, feeToken?.id, token]);

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amount: "" }));
	}, []);

	return {
		formData,
		tokens,
		isLoadingTokens,
		sender,
		recipient,
		token,
		plancks,
		balanceRecipient,
		balanceSender,
		isLoadingBalanceSender,

		onAmountChange,
		onTokenChange,
		onFromChange,
		onToChange,
		onMaxClick,
		onReset,

		call,
		fakeCall,
	};
};

export const [TransferProvider, useTransfer] =
	provideContext(useTransferProvider);
