import { logger } from "@kheopswap/utils";
import {
	useAssetConvertPlancks,
	useAssetConvertPrice,
} from "./useAssetConvertPlancks";
import { useTokenChain } from "./useTokenChain";

import type { TokenId } from "@kheopswap/registry";

type UseStablePrice = {
	tokenId: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

export const useStablePlancks = ({ tokenId, plancks }: UseStablePrice) => {
	const stop = logger.cumulativeTimer("useStablePlancks");

	const chain = useTokenChain({ tokenId });
	const { isLoading, tokenIn, tokenOut, plancksOut } = useAssetConvertPlancks({
		tokenIdIn: tokenId,
		tokenIdOut: chain?.stableTokenId,
		plancks,
	});
	stop();
	return {
		isLoading,
		token: tokenIn,
		stableToken: tokenOut,
		stablePlancks: plancksOut,
	};
};

export const useStablePrice = ({ tokenId, plancks }: UseStablePrice) => {
	const stop = logger.cumulativeTimer("useStablePrice");
	const chain = useTokenChain({ tokenId });
	const { isLoading, price, tokenIn, tokenOut } = useAssetConvertPrice({
		tokenIdIn: tokenId,
		tokenIdOut: chain?.stableTokenId,
		plancks,
	});

	stop();
	return {
		isLoading,
		token: tokenIn,
		stableToken: tokenOut,
		price,
	};
};
