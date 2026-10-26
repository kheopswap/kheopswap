import { groupBy, keys, mapValues } from "lodash-es";
import { useMemo } from "react";
import type { PolkadotAccount } from "../common/kheopskit";
import type { Token, TokenId } from "../registry/tokens/types";
import type {
	AccountBalanceWithStable,
	BalanceWithStableSummary,
} from "../types/balances";
import {
	getHoldingValuation,
	type HoldingValuation,
} from "../utils/getHoldingValuation";
import { isApplicableBalance } from "../utils/isApplicableBalance";
import { useBalancesWithStables } from "./useBalancesWithStables";
import { type TokenValuations, useTokenValuations } from "./useTokenValuations";

type UseBalancesByTokenSummaryProps = {
	tokens: Token[] | TokenId[] | null | undefined;
	accounts: PolkadotAccount[] | string[] | null | undefined;
};

const isPriced = (
	balance: AccountBalanceWithStable,
): balance is AccountBalanceWithStable & { status: "priced" } =>
	balance.status === "priced";

const summarizeValuation = (
	balances: AccountBalanceWithStable[],
): HoldingValuation => {
	const known = balances.filter((b) => b.tokenPlancks !== null);
	const unvalued = known.find((b) => !isPriced(b));
	if (unvalued) return { status: unvalued.status, stablePlancks: null };
	return {
		status: "priced",
		stablePlancks: known
			.filter(isPriced)
			.reduce((acc, { stablePlancks }) => acc + stablePlancks, 0n),
	};
};

export const getBalancesByTokenSummary = (
	balances: AccountBalanceWithStable[],
) => {
	const balancesByTokenId = groupBy(
		balances.filter(isApplicableBalance),
		"tokenId",
	);

	return keys(balancesByTokenId).reduce(
		(acc, tokenId) => {
			const tokenBalances = balancesByTokenId[
				tokenId
			] as AccountBalanceWithStable[];
			const tokenPlancks = tokenBalances.reduce(
				(acc, { tokenPlancks }) => acc + (tokenPlancks ?? 0n),
				0n,
			);
			const isLoadingTokenPlancks = tokenBalances.some(
				(b) => b.isLoadingTokenPlancks,
			);
			const isLoadingStablePlancks = tokenBalances.some(
				(b) => b.isLoadingStablePlancks,
			);
			const isInitializing =
				tokenPlancks === 0n &&
				tokenBalances.some((b) => b.tokenPlancks === null);

			acc[tokenId] = {
				tokenId,
				tokenPlancks,
				isLoadingTokenPlancks,
				isLoadingStablePlancks,
				isInitializing,
				...summarizeValuation(tokenBalances),
			};
			return acc;
		},
		{} as Record<TokenId, BalanceWithStableSummary>,
	);
};

export const valueHoldingsTogether = (
	summary: Record<TokenId, BalanceWithStableSummary>,
	tokenValuations: TokenValuations,
): Record<TokenId, BalanceWithStableSummary> =>
	mapValues(summary, (tokenSummary) => {
		const tokenValuation = tokenValuations[tokenSummary.tokenId];
		if (!tokenValuation)
			return { ...tokenSummary, isLoadingStablePlancks: true };
		return {
			...tokenSummary,
			isLoadingStablePlancks: tokenValuation.isLoading,
			...getHoldingValuation({
				...tokenValuation,
				plancks: tokenSummary.tokenPlancks ?? 0n,
			}),
		};
	});

export const useBalancesByTokenSummaryOf = (
	balances: AccountBalanceWithStable[],
) => {
	const summary = useMemo(
		() => getBalancesByTokenSummary(balances),
		[balances],
	);

	const tokenIds = useMemo(() => keys(summary).sort(), [summary]);
	const { data: tokenValuations } = useTokenValuations(tokenIds);

	return useMemo(
		() => valueHoldingsTogether(summary, tokenValuations),
		[summary, tokenValuations],
	);
};

export const useBalancesByTokenSummary = ({
	tokens,
	accounts,
}: UseBalancesByTokenSummaryProps) => {
	const { data: balances, isLoading } = useBalancesWithStables({
		tokens,
		accounts,
	});

	const data = useBalancesByTokenSummaryOf(balances);

	return { data, isLoading };
};
