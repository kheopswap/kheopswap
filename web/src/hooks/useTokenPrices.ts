import { keyBy, values } from "lodash";
import { useMemo } from "react";
import { parseUnits } from "viem";

import { useAllTokens } from "./useAllTokens";
import {
	type UseAssetConvertMultiProps,
	useAssetConvertMulti,
} from "./useAssetConvertMulti";
import { useNativeToken } from "./useNativeToken";
import { useRelayChains } from "./useRelayChains";

import { TRADABLE_TOKEN_TYPES } from "@kheopswap/registry";
import { isBigInt } from "@kheopswap/utils";
import type { BalanceWithStableSummary } from "src/types";
import { getAssetHubMirrorTokenId } from "src/util";

export const useTokenPrices = () => {
	const { data: tokens, isLoading: isLoadingTokens } = useAllTokens({
		types: TRADABLE_TOKEN_TYPES,
	});

	const { stableToken, assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });

	const nativePriceInputs = useMemo<UseAssetConvertMultiProps>(
		() => ({
			inputs: values(tokens).map((token) => ({
				tokenIdIn: token.id,
				plancksIn: parseUnits("1", token.decimals),
				tokenIdOut: nativeToken.id,
			})),
		}),
		[nativeToken.id, tokens],
	);

	const stablePriceInputs = useMemo<UseAssetConvertMultiProps>(
		() => ({
			inputs: values(tokens).map((token) => ({
				tokenIdIn: getAssetHubMirrorTokenId(token.id),
				plancksIn: parseUnits("1", token.decimals),
				tokenIdOut: stableToken.id,
			})),
		}),
		[stableToken.id, tokens],
	);

	const { data: nativePrices, isLoading: isLoadingNativePrices } =
		useAssetConvertMulti(nativePriceInputs);

	const { data: stablePrices, isLoading: isLoadingStablePrices } =
		useAssetConvertMulti(stablePriceInputs);

	const data = useMemo<BalanceWithStableSummary[]>(() => {
		const nativePricesMap = keyBy(nativePrices, "tokenIdIn");
		const stablePricesMap = keyBy(stablePrices, "tokenIdIn");

		return values(tokens).map((token) => {
			const priceTokenId = getAssetHubMirrorTokenId(token.id);
			const nativePrice = nativePricesMap[priceTokenId];
			const stablePrice = stablePricesMap[priceTokenId];

			return {
				tokenId: token.id,
				tokenPlancks: nativePrice?.plancksOut ?? null,
				isLoadingTokenPlancks: nativePrice?.isLoading ?? false,
				stablePlancks: stablePrice?.plancksOut ?? null,
				isLoadingStablePlancks: stablePrice?.isLoading ?? false,
				isInitializing:
					!isBigInt(nativePrice?.plancksOut) && !!nativePrice?.isLoading,
			};
		});
	}, [nativePrices, stablePrices, tokens]);

	return {
		data,
		isLoading:
			isLoadingTokens || isLoadingNativePrices || isLoadingStablePrices,
	};
};
