import { STABLE_ASSET_ID } from "@kheopswap/constants";
import {
	useAssetConvertPlancks,
	useAssetConvertPrice,
} from "./useAssetConvertPlancks";

import type { TokenId } from "@kheopswap/registry";
import { useStableToken } from "src/state";

type UseStablePrice = {
	tokenId: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

export const useStablePlancks = ({ tokenId, plancks }: UseStablePrice) => {
	//const chain = useTokenChain({ tokenId });

	const { isLoading, tokenIn, tokenOut, plancksOut } = useAssetConvertPlancks({
		tokenIdIn: tokenId,
		tokenIdOut: STABLE_ASSET_ID,
		plancks,
	});

	return {
		isLoading,
		token: tokenIn,
		stableToken: tokenOut,
		stablePlancks: plancksOut,
	};
};

export const useStablePrice = ({ tokenId, plancks }: UseStablePrice) => {
	const stableToken = useStableToken();
	//	const chain = useTokenChain({ tokenId });

	const { isLoading, price, tokenIn, tokenOut } = useAssetConvertPrice({
		tokenIdIn: tokenId,
		tokenIdOut: stableToken.id, // "asset::pah::1337",
		plancks,
	});

	return {
		isLoading,
		token: tokenIn,
		stableToken: tokenOut,
		price,
	};
};
