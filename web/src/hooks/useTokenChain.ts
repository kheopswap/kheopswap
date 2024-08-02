import { useMemo } from "react";

import { useRelayChains } from "./useRelayChains";

import { TokenId, parseTokenId } from "src/config/tokens";
import { Chain } from "src/config/chains";

type UseTokenChainProps<T extends TokenId | null | undefined> = {
	tokenId: T;
};

type UseTokenChainResult<T> = T extends TokenId ? Chain : null;

export const useTokenChain = <T extends TokenId | null | undefined>({
	tokenId,
}: UseTokenChainProps<T>): UseTokenChainResult<T> => {
	const { relay, assetHub } = useRelayChains();

	return useMemo(() => {
		if (!tokenId) return null as UseTokenChainResult<T>;
		const parsed = parseTokenId(tokenId);
		return [relay, assetHub].find(
			(chain) => chain.id === parsed.chainId,
		) as UseTokenChainResult<T>;
	}, [assetHub, relay, tokenId]);
};
