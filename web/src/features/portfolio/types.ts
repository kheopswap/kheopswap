import { Token } from "src/config/tokens";

export type TokenBalancesSummaryData = {
  tokenPlancks: bigint | undefined;
  isLoadingTokenPlancks: boolean;
  stablePlancks: bigint | null;
  isLoadingStablePlancks: boolean;
};

export type PortfolioVisibleColunm = "tvl" | "balance";

export type PortfolioRowData = {
  token: Token;
  stableToken: Token;
  balance: TokenBalancesSummaryData;
  tvl: TokenBalancesSummaryData | null;
};