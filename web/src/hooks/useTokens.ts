import { useMemo } from "react";
import { keyBy } from "lodash";

import { useTokensByChainIds } from "./useTokensByChainIds";

import { getChainIdFromTokenId, TokenId } from "src/config/tokens";
import { ChainId } from "src/config/chains";

type UseTokensProps = { tokenIds: TokenId[] };

export const useTokens = ({ tokenIds }: UseTokensProps) => {
  const chainIds = useMemo(
    () => [
      ...new Set(
        tokenIds
          .map(getChainIdFromTokenId) // TODO why allow null ?
          .filter(Boolean) as ChainId[],
      ),
    ],
    [tokenIds],
  );

  const { data: allTokens, isLoading } = useTokensByChainIds({
    chainIds,
  });

  const data = useMemo(() => {
    const allTokensMap = keyBy(allTokens, "id");
    return tokenIds.map((tokenId) => allTokensMap[tokenId]).filter(Boolean);
  }, [allTokens, tokenIds]);

  return { data, isLoading };
};
