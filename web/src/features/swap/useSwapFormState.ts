import { useCallback, useEffect, useMemo } from "react";
import { setSetting } from "../../common/settings";
import { useNativeToken } from "../../hooks/useNativeToken";
import { usePersistedFormDraft } from "../../hooks/usePersistedFormDraft";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import { getTokenId } from "../../registry/tokens/helpers";
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
import { SWAP_DRAFT_FIELDS, type SwapFormInputs } from "./schema";
import { getDraftOnRelay } from "./swapDraft";

export const useSwapFormState = () => {
	const { assetHub, allChains } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });

	const baseDefaults = useMemo<SwapFormInputs>(
		() => ({
			from: "",
			to: "",
			tokenIdIn: nativeToken?.id ?? "",
			tokenIdOut: "",
			amountIn: "",
		}),
		[nativeToken?.id],
	);

	const [formData, setFormData] = usePersistedFormDraft(
		baseDefaults,
		SWAP_DRAFT_FIELDS,
	);

	const { from, tokenIdIn, tokenIdOut } = formData;

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

	useEffect(() => {
		setFormData((prev) => getDraftOnRelay(prev, allChains, assetHub.id));
	}, [assetHub.id, allChains, setFormData]);

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
