import type { TokenId } from "../registry/tokens/types";

export type BalanceWithStable = {
	tokenId: TokenId;
	tokenPlancks: bigint | null;
	isLoadingTokenPlancks: boolean;
	stablePlancks: bigint | null;
	isLoadingStablePlancks: boolean;
};

export type BalanceWithStableSummary = BalanceWithStable & {
	isInitializing: boolean;
};

export type AccountBalanceWithStable = {
	address: string;
} & BalanceWithStable;
