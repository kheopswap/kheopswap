import { useMemo } from "react";

import {
  useAssetHubTVL,
  useBalances,
  useRelayChains,
  useToken,
  useWallets,
} from "src/hooks";
import { useStablePlancksMulti } from "src/hooks/useStablePlancks";
import { useTokensByChainIds } from "src/hooks/useTokens";
import { provideContext } from "src/util";

export const usePortfolioProvider = () => {
  const { accounts } = useWallets();

  const { allChains, assetHub } = useRelayChains();
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
    // TODO account/chain compatibility filter (substrate vs ethereum)
    return tokens.flatMap((token) =>
      accounts.map((acc) => ({
        address: acc.address,
        tokenId: token.id,
      })),
    );
  }, [accounts, tokens]);

  const { data: rawBalances, isLoading: isLoadingBalances } = useBalances({
    balanceDefs,
  });

  const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });
  const { data: stables } = useStablePlancksMulti({
    inputs: rawBalances.map(({ tokenId, balance }) => ({
      tokenId,
      plancks: balance,
    })),
  });

  const { data: tvl } = useAssetHubTVL();

  const balances = useMemo(
    () =>
      rawBalances.map((b, idx) => ({
        ...b,
        ...stables[idx],
      })),
    [rawBalances, stables],
  );

  return {
    isLoading: isLoadingTokens || isLoadingBalances,
    balances,
    accounts,
    tokens,
    stableToken: stableToken!,
    tvl,
  };
};

export const [PortfolioProvider, usePortfolio] =
  provideContext(usePortfolioProvider);
