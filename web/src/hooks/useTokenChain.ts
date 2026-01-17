import type { Chain } from "@kheopswap/registry";
import { parseTokenId, type TokenId } from "@kheopswap/registry";
import { useMemo } from "react";
import { useRelayChains } from "src/state";

type UseTokenChainProps<T extends TokenId | null | undefined> = {
	tokenId: T;
};

type UseTokenChainResult<T> = T extends TokenId ? Chain : null;

export const useTokenChain = <T extends TokenId | null | undefined>({
	tokenId,
}: UseTokenChainProps<T>): UseTokenChainResult<T> => {
	const { allChains } = useRelayChains();

	return useMemo(() => {
		if (!tokenId) return null as UseTokenChainResult<T>;
		const parsed = parseTokenId(tokenId);
		return allChains.find(
			(chain) => chain.id === parsed.chainId,
		) as UseTokenChainResult<T>;
	}, [allChains, tokenId]);
};
