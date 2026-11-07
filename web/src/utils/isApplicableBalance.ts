import type { BalanceWithStable } from "../types/balances";

export const isApplicableBalance = ({
	tokenPlancks,
	isLoadingTokenPlancks,
}: BalanceWithStable) => tokenPlancks !== null || isLoadingTokenPlancks;
