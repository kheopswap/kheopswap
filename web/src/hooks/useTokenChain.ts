import { useMemo } from "react";
import type { Chain } from "../registry/chains/types";
import { parseTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import { useRelayChains } from "../state/relay";

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
