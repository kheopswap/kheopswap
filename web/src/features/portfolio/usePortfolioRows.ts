import { useMemo } from "react";

import { usePortfolio } from "./PortfolioProvider";
import { PortfolioRowData } from "./types";

import { getBalancesByTokenSummary } from "src/hooks";

export const usePortfolioRows = () => {
  const { balances, tokens, tvl: allTvls } = usePortfolio();

  const balancesByTokenId = useMemo(
    () => getBalancesByTokenSummary(balances),
    [balances],
  );

  return useMemo(
    () =>
      tokens.map<PortfolioRowData>((token) => {
        return {
          token,
          balance: balancesByTokenId[token.id] ?? null,
          tvl: allTvls.find((t) => t.tokenId === token.id) ?? null,
        };
      }),
    [allTvls, balancesByTokenId, tokens],
  );
};
