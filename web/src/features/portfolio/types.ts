import type { Token } from "src/config/tokens";
import type { BalanceWithStableSummary } from "src/types";

export type PortfolioVisibleCol = "price" | "balance";

export type PortfolioRowData = {
	token: Token;
	balance: BalanceWithStableSummary | null;
	tvl: BalanceWithStableSummary | null;
	price: BalanceWithStableSummary | null;
};

export type PortfolioSortMode = "price" | "balance" | "symbol";
