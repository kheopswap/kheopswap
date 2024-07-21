import { useMemo } from "react";

import { useBalances, useRelayChains, useWallets } from "src/hooks";
import { useTokensByChainIds } from "src/hooks/useTokens";
import { provideContext } from "src/util";

export const usePortfolioProvider = () => {
  const { accounts } = useWallets();

  const { allChains } = useRelayChains();
  const chainIds = useMemo(
    () => allChains.map((chain) => chain.id),
    [allChains],
  );

  const { data: allTokens, isLoading: isLoadingTokens } = useTokensByChainIds({
    chainIds,
  });

  const tokens = useMemo(
    () => allTokens.filter((t) => t.type !== "pool-asset"),
    [allTokens],
  );

  const balanceDefs = useMemo(() => {
    // TODO genesishHash filter
    // TODO account/chain compatibility filter
    return tokens.flatMap((token) =>
      accounts.map((acc) => ({
        address: acc.address,
        tokenId: token.id,
      })),
    );
  }, [accounts, tokens]);

  const { data: balances, isLoading: isLoadingBalances } = useBalances({
    balanceDefs,
  });

  // TODO stablePrice for each non null token with positive balance

  return {
    isLoading: isLoadingTokens || isLoadingBalances,
    balances,
    accounts,
    tokens,
  };
};

export const [PortfolioProvider, usePortfolio] =
  provideContext(usePortfolioProvider);
