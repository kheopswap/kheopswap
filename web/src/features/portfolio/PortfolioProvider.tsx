import { useMemo } from "react";

import {
  useAssetHubTVL,
  useRelayChains,
  useWallets,
  useTokensByChainIds,
  useBalancesWithStables,
} from "src/hooks";
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

  const { data: tvl } = useAssetHubTVL();

  const { data: balances, isLoading: isLoadingBalances } =
    useBalancesWithStables({ tokens, accounts });

  return {
    isLoading: isLoadingTokens || isLoadingBalances,
    balances,
    accounts,
    tokens,
    tvl,
  };
};

export const [PortfolioProvider, usePortfolio] =
  provideContext(usePortfolioProvider);
