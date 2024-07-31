import {
  useAssetHubTVL,
  useWallets,
  useBalancesWithStables,
  useAllTokens,
} from "src/hooks";
import { provideContext } from "src/util";
import { useTokenPrices } from "src/hooks/useTokenPrices";
import { TRADABLE_TOKEN_TYPES } from "src/config/tokens";

export const usePortfolioProvider = () => {
  const { accounts } = useWallets();

  const { data: tokens, isLoading: isLoadingTokens } = useAllTokens({
    types: TRADABLE_TOKEN_TYPES,
  });

  const { data: tvl } = useAssetHubTVL();

  const { data: balances, isLoading: isLoadingBalances } =
    useBalancesWithStables({ tokens, accounts });

  const { data: prices, isLoading: isLoadingPrices } = useTokenPrices();

  return {
    isLoading: isLoadingTokens || isLoadingBalances || isLoadingPrices,
    balances,
    accounts,
    tokens,
    tvl,
    prices,
  };
};

export const [PortfolioProvider, usePortfolio] =
  provideContext(usePortfolioProvider);
