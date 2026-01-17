import { type TokenId, TRANSFERABLE_TOKEN_TYPES } from "@kheopswap/registry";
import {
	getAddressFromAccountField,
	isNumber,
	plancksToTokens,
	provideContext,
	tokensToPlancks,
} from "@kheopswap/utils";
import { isEqual } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
	useAllTokens,
	useAssetConvertPlancks,
	useBalance,
	useCanAccountReceive,
	useEstimateFee,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	useNonce,
	useSetting,
	useTokenChain,
	useWalletAccount,
} from "src/hooks";
import { useRelayChains } from "src/state";
import { getFeeAssetLocation } from "src/util";
import { getTxOptions } from "src/util/getTxOptions";
import type { TransferFormInputs } from "./schema";
import { useTransferExtrinsic } from "./useTransferExtrinsic";

const useFormData = () => {
	const { assetHub } = useRelayChains();
	const ahNativeToken = useNativeToken({ chain: assetHub });

	const location = useLocation();
	const navigate = useNavigate();

	const [defaultAccountId, setDefaultAccountId] =
		useSetting("defaultAccountId");

	const account = useWalletAccount({ id: defaultAccountId });

	const defaultValues = useMemo<TransferFormInputs>(
		() => ({
			from: account?.id ?? "",
			tokenId: ahNativeToken?.id ?? "",
			amount: "",
			to: "",
			...location.state,
		}),
		[account?.id, ahNativeToken?.id, location.state],
	);

	const [formData, setFormData] = useState<TransferFormInputs>(defaultValues);

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

const useTransferProvider = () => {
	const [formData, setFormData] = useFormData();

	const { relay, assetHub } = useRelayChains();
	const defaultToken = useNativeToken({ chain: assetHub });

	const { data: tokens, isLoading: isLoadingTokens } = useAllTokens({
		types: TRANSFERABLE_TOKEN_TYPES,
	});

	const sender = useMemo(
		() => getAddressFromAccountField(formData.from),
		[formData.from],
	);

	const recipient = useMemo(
		() => getAddressFromAccountField(formData.to),
		[formData.to],
	);

	const token = useMemo(
		() => tokens[formData.tokenId] ?? null,
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
	}, [defaultToken, relay.id, tokenChain?.relay, setFormData]);

	const [
		plancks,
		//  isValidAmount
	] = useMemo(() => {
		try {
			return formData.amount && token
				? [tokensToPlancks(formData.amount, token.decimals), true]
				: [null, true];
		} catch (_err) {
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

	const { data: checkCanAccountReceive, isLoading: isCheckingRecipient } =
		useCanAccountReceive({
			address: recipient,
			tokenId: token?.id,
			plancks,
		});

	const outputErrorMessage = useMemo(
		() => checkCanAccountReceive?.reason,
		[checkCanAccountReceive?.reason],
	);

	const onTokenChange = useCallback(
		(tokenId: TokenId) => {
			setFormData((prev) => ({ ...prev, tokenId }));
		},
		[setFormData],
	);

	const onFromChange = useCallback(
		(accountId: string) => {
			setFormData((prev) => ({ ...prev, from: accountId }));
		},
		[setFormData],
	);

	const onToChange = useCallback(
		(address: string) => {
			setFormData((prev) => ({ ...prev, to: address }));
		},
		[setFormData],
	);

	const onAmountChange = useCallback(
		(amount: string) => {
			setFormData((prev) => ({ ...prev, amount }));
		},
		[setFormData],
	);

	const onMaxClick = useCallback(() => {
		if (token && balanceSender) {
			let plancks = balanceSender;

			const nativeMargin =
				2n * (feeToken?.id === token?.id ? (feeEstimate ?? 0n) : 0n) +
				(edTokenIn ?? 0n);

			if (token.type === "native" && nativeMargin <= plancks)
				plancks = plancks - nativeMargin;

			setFormData((prev) => ({
				...prev,
				amount: plancksToTokens(plancks, token.decimals),
			}));
		}
	}, [balanceSender, edTokenIn, feeEstimate, feeToken?.id, token, setFormData]);

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amount: "" }));
	}, [setFormData]);

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
		outputErrorMessage,

		onAmountChange,
		onTokenChange,
		onFromChange,
		onToChange,
		onMaxClick,
		onReset,

		call: outputErrorMessage || isCheckingRecipient ? undefined : call,
		fakeCall,
	};
};

export const [TransferProvider, useTransfer] =
	provideContext(useTransferProvider);
