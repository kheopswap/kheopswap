import { useCallback, useEffect, useMemo } from "react";
import { setSetting } from "../../common/settings";
import { useNativeToken } from "../../hooks/useNativeToken";
import { usePersistedFormDraft } from "../../hooks/usePersistedFormDraft";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import { getTokenId, parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import {
	canFlipSwapTokens,
	getNextSwapTokens,
	resolveSwapRoute,
	type SwapTokensChange,
} from "./routes/swapRoute";
import { useXcmTransferMirrorTokenIds } from "./routes/xcmTransferMirrors";
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

	const mirrors = useXcmTransferMirrorTokenIds();
	const routeContext = useMemo(
		() => ({
			assetHubId: assetHub.id,
			mirrors,
			nativeTokenId: getTokenId({ type: "native", chainId: assetHub.id }),
		}),
		[assetHub.id, mirrors],
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

		const isInvalidTokenIn =
			tokenIn?.chainId && tokenIn.chainId !== assetHub.id;
		const isInvalidTokenOut =
			tokenOut?.chainId &&
			!allChains.some((chain) => chain.id === tokenOut.chainId);

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
		mirrors,
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
