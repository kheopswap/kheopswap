import type { Token } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";

export type PortfolioVisibleCol = "price" | "balance";

export type PortfolioRowData = {
	token: Token;
	balance: BalanceWithStableSummary | null;
	tvl: BalanceWithStableSummary | null;
	price: BalanceWithStableSummary | null;
};

export type PortfolioSortMode = "price" | "balance" | "symbol";
