import type { TokenId } from "../registry/tokens/types";
import type { HoldingValuation } from "../utils/getHoldingValuation";

export type BalanceWithStable = {
	tokenId: TokenId;
	tokenPlancks: bigint | null;
	isLoadingTokenPlancks: boolean;
	isLoadingStablePlancks: boolean;
} & HoldingValuation;

export type BalanceWithStableSummary = BalanceWithStable & {
	isInitializing: boolean;
};

export type AccountBalanceWithStable = {
	address: string;
} & BalanceWithStable;
