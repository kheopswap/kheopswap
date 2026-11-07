import { useCallback, useEffect, useMemo } from "react";
import { setSetting } from "../../common/settings";
import { useNativeToken } from "../../hooks/useNativeToken";
import { usePersistedFormDraft } from "../../hooks/usePersistedFormDraft";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import type { ChainId } from "../../registry/chains/types";
import { getTokenId, parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import {
	canFlipSwapTokens,
	getNextSwapTokens,
	resolveSwapRoute,
	type SwapRouteContext,
	type SwapTokensChange,
} from "./routes/swapRoute";
import { useXcmRouteMirrors } from "./routes/xcmRouteMirrors";
import type { SwapFormInputs } from "./schema";

export const useSwapFormState = () => {
	const { assetHub, allChains } = useRelayChains();
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

	const { mirrors, hydrationFeeAssetIds } = useXcmRouteMirrors();
	const routeContext = useMemo<SwapRouteContext>(
		() => ({
			assetHubId: assetHub.id,
			mirrors,
			hydrationFeeAssetIds,
			nativeTokenId: getTokenId({ type: "native", chainId: assetHub.id }),
		}),
		[assetHub.id, mirrors, hydrationFeeAssetIds],
	);

	const route = useMemo(
		() => resolveSwapRoute({ ...routeContext, tokenIdIn, tokenIdOut }),
		[routeContext, tokenIdIn, tokenIdOut],
	);

	const canFlip = useMemo(
		() =>
			canFlipSwapTokens(
				{ tokenIdIn: formData.tokenIdIn, tokenIdOut: formData.tokenIdOut },
				routeContext,
			),
		[formData.tokenIdIn, formData.tokenIdOut, routeContext],
	);

	// Reset tokens when chain changes
	useEffect(() => {
		if (!assetHub) return;

		const tokenIn = formData.tokenIdIn
			? parseTokenId(formData.tokenIdIn as TokenId)
			: null;
		const tokenOut = formData.tokenIdOut
			? parseTokenId(formData.tokenIdOut as TokenId)
			: null;

		const isOnOtherRelay = (chainId: ChainId | undefined) =>
			chainId && !allChains.some((chain) => chain.id === chainId);
		const isInvalidTokenIn = isOnOtherRelay(tokenIn?.chainId);
		const isInvalidTokenOut = isOnOtherRelay(tokenOut?.chainId);

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
	}, [assetHub, allChains, formData, setFormData]);

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

	const changeTokens = useCallback(
		(change: SwapTokensChange) => {
			setFormData((prev) => ({
				...prev,
				...getNextSwapTokens(prev, change, routeContext),
			}));
		},
		[routeContext, setFormData],
	);

	const onTokenInChange = useCallback(
		(tokenId: TokenId) => changeTokens({ type: "in", tokenId }),
		[changeTokens],
	);

	const onTokenOutChange = useCallback(
		(tokenId: TokenId) => changeTokens({ type: "out", tokenId }),
		[changeTokens],
	);

	const onSwapTokens = useCallback(
		() => changeTokens({ type: "flip" }),
		[changeTokens],
	);

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amountIn: "" }));
	}, [setFormData]);

	return {
		formData,
		setFormData,
		from,
		tokenIdIn,
		tokenIdOut,
		route,
		routeContext,
		canFlip,
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
