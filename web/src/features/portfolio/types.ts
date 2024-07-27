import { Token } from "src/config/tokens";
import { BalanceWithStable } from "src/types";

export type PortfolioVisibleColunm = "tvl" | "balance";

export type PortfolioRowData = {
  token: Token;
  balance: BalanceWithStable | null;
  tvl: BalanceWithStable | null;
};

export type PortfolioSortMode = "tvl" | "balance" | "symbol";
