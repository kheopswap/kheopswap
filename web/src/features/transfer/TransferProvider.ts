import { useCallback, useEffect, useMemo } from "react";
import { useAllTokens } from "../../hooks/useAllTokens";
import { useAssetConvertPlancks } from "../../hooks/useAssetConvertPlancks";
import { useBalance } from "../../hooks/useBalance";
import { useCanAccountReceive } from "../../hooks/useCanAccountReceive";
import { useEstimateFee } from "../../hooks/useEstimateFee";
import { useExistentialDeposit } from "../../hooks/useExistentialDeposit";
import { useFeeToken } from "../../hooks/useFeeToken";
import { useNativeToken } from "../../hooks/useNativeToken";
import { useNonce } from "../../hooks/useNonce";
import { usePersistedFormDraft } from "../../hooks/usePersistedFormDraft";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import { useTokenChain } from "../../hooks/useTokenChain";
import { TRANSFERABLE_TOKEN_TYPES } from "../../registry/tokens/tokens";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { getAddressFromAccountField } from "../../utils/getAddressFromAccountField";
import { getFeeAssetLocation } from "../../utils/getFeeAssetLocation";
import { getTxOptions } from "../../utils/getTxOptions";
import { isNumber } from "../../utils/isNumber";
import { plancksToTokens, tokensToPlancks } from "../../utils/plancks";
import { provideContext } from "../../utils/provideContext";
import type { TransferFormInputs } from "./schema";
import { useTransferExtrinsic } from "./useTransferExtrinsic";

const useTransferProvider = () => {
	const { assetHub } = useRelayChains();
	const defaultToken = useNativeToken({ chain: assetHub });

	const baseDefaults = useMemo<TransferFormInputs>(
		() => ({
			from: "",
			tokenId: (defaultToken?.id ?? "") as TokenId,
			amount: "",
			to: "",
		}),
		[defaultToken?.id],
	);

	const [formData, setFormData] =
		usePersistedFormDraft<TransferFormInputs>(baseDefaults);

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

	const { resolvedAddress, isLoading: isResolvingRecipient } =
		useResolvedSubstrateAddress({
			address: recipient,
			chainId: tokenChain?.id,
		});

	const nativeToken = useNativeToken({ chain: tokenChain });

	const { feeToken } = useFeeToken({
		chainId: tokenChain?.id,
		accountId: sender,
	});

	// if asset hub changes, use its native token as default
	useEffect(() => {
		if (tokenChain?.relay !== assetHub.relay && defaultToken) {
			setFormData((prev) => ({
				...prev,
				tokenId: defaultToken.id,
			}));
		}
	}, [defaultToken, assetHub.relay, tokenChain?.relay, setFormData]);

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
		recipient: resolvedAddress,
	});

	const { data: fakeCall } = useTransferExtrinsic({
		tokenId: token?.id,
		plancks: edTokenIn ?? null,
		recipient: resolvedAddress ?? sender,
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
		address: resolvedAddress,
		tokenId: token?.id,
	});

	const { data: checkCanAccountReceive, isLoading: isCheckingRecipient } =
		useCanAccountReceive({
			address: resolvedAddress,
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
		resolvedAddress,
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

		call:
			outputErrorMessage || isCheckingRecipient || isResolvingRecipient
				? undefined
				: call,
		fakeCall,
	};
};

export const [TransferProvider, useTransfer] =
	provideContext(useTransferProvider);
