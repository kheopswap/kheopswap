import { Token } from "src/config/tokens";
import { BalanceWithStableSummary } from "src/types";

export type PortfolioVisibleColunm = "tvl" | "balance";

export type PortfolioRowData = {
  token: Token;
  balance: BalanceWithStableSummary | null;
  tvl: BalanceWithStableSummary | null;
};

export type PortfolioSortMode = "tvl" | "balance" | "symbol";
