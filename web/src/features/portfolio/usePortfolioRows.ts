import { useMemo } from "react";
import { groupBy } from "lodash";

import { usePortfolio } from "./PortfolioProvider";
import { PortfolioRowData, TokenBalancesSummaryData } from "./types";

export const usePortfolioRows = () => {
  const { balances, tokens, stableToken, tvl } = usePortfolio();

  return useMemo(() => {
    const balancesByTokenId = groupBy(balances, "tokenId");

    return tokens.map<PortfolioRowData>((token) => {
      const tokenBalances = balancesByTokenId[token.id] ?? [];
      const total = tokenBalances.reduce(
        (acc, { balance }) => acc + (balance ?? 0n),
        0n,
      );
      const hasStable = tokenBalances.some(
        (tb) => tb.stablePlancks !== null && tb.balance,
      );
      const totalStables = hasStable
        ? tokenBalances.reduce(
            (acc, { stablePlancks }) => acc + (stablePlancks ?? 0n),
            0n,
          )
        : null;
      const isLoading = tokenBalances.some(({ isLoading }) => isLoading);
      const isLoadingStables = tokenBalances.some(
        ({ isLoadingStablePlancks }) => isLoadingStablePlancks,
      );
      const balance: TokenBalancesSummaryData = {
        tokenPlancks: total,
        isLoadingTokenPlancks: isLoading,
        stablePlancks: totalStables,
        isLoadingStablePlancks: isLoadingStables,
      };

      const tokenTvl = tvl.find((t) => t.tokenId === token.id);
      const rowTvl: TokenBalancesSummaryData | null = tokenTvl
        ? {
            tokenPlancks: tokenTvl.plancks,
            isLoadingTokenPlancks: tokenTvl.isLoading,
            stablePlancks: tokenTvl.stablePlancks,
            isLoadingStablePlancks: tokenTvl.isLoadingStablePlancks,
          }
        : null;

      return {
        token,
        stableToken,
        balance,
        balances,
        tvl: rowTvl,
      };
    });
  }, [balances, stableToken, tokens, tvl]);
};
