import { Token } from "src/config/tokens";
import { BalanceState } from "src/hooks";

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

export type PortfolioSortMode = "tvl" | "balance" | "symbol";

export type BalanceAndFiat = BalanceState & {
  stablePlancks: bigint | null;
  isLoadingStablePlancks: boolean;
};
