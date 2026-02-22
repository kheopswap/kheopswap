import { useCallback, useEffect, useMemo } from "react";
import { setSetting } from "../../common/settings";
import { useNativeToken } from "../../hooks/useNativeToken";
import { usePersistedFormDraft } from "../../hooks/usePersistedFormDraft";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import { getTokenId, parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import type { SwapFormInputs } from "./schema";

export const useSwapFormState = () => {
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });

	const baseDefaults = useMemo<SwapFormInputs>(
		() => ({
			from: "",
			to: "",
			tokenIdIn: (nativeToken?.id ?? "") as TokenId,
			tokenIdOut: "" as TokenId,
			amountIn: "",
		}),
		[nativeToken?.id],
	);

	const [formData, setFormData] =
		usePersistedFormDraft<SwapFormInputs>(baseDefaults);

	const { from, tokenIdIn, tokenIdOut } = useMemo(
		() => ({
			from: formData.from,
			tokenIdIn: formData.tokenIdIn as TokenId | undefined,
			tokenIdOut: formData.tokenIdOut as TokenId | undefined,
		}),
		[formData],
	);

	const account = useWalletAccount({ id: from });
	const { resolvedAddress: resolvedSubstrateAddress } =
		useResolvedSubstrateAddress({
			address: account?.address,
			chainId: assetHub.id,
		});

	// Reset tokens when chain changes
	useEffect(() => {
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
				tokenIdOut: "" as TokenId,
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

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amountIn: "" }));
	}, [setFormData]);

	return {
		formData,
		setFormData,
		from,
		tokenIdIn,
		tokenIdOut,
		account,
		resolvedSubstrateAddress,
		onFromChange,
		onAmountInChange,
		onTokenInChange,
		onTokenOutChange,
		onSwapTokens,
		onReset,
	};
};
