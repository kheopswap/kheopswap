import { Token } from "src/config/tokens";
import { BalanceWithStableSummary } from "src/types";

export type PortfolioVisibleColunm = "price" | "balance";

export type PortfolioRowData = {
  token: Token;
  balance: BalanceWithStableSummary | null;
  tvl: BalanceWithStableSummary | null;
  price: BalanceWithStableSummary | null;
};

export type PortfolioSortMode = "price" | "balance" | "symbol";
