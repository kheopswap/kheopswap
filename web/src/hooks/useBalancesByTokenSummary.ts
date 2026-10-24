import { groupBy, keys, mapValues, values } from "lodash-es";
import { useMemo } from "react";
import type { PolkadotAccount } from "../common/kheopskit";
import type { Token, TokenId } from "../registry/tokens/types";
import type { HoldingStablePlancks } from "../state/prices";
import type {
	AccountBalanceWithStable,
	BalanceWithStableSummary,
} from "../types/balances";
import type { HoldingValuation } from "../utils/getHoldingValuation";
import { isApplicableBalance } from "../utils/isApplicableBalance";
import { logger } from "../utils/logger";
import { useBalancesWithStables } from "./useBalancesWithStables";
import { useHoldingValuations } from "./useHoldingValuations";

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
	valuations: Record<TokenId, HoldingStablePlancks>,
) =>
	mapValues(summary, (tokenSummary) => {
		const valuation = valuations[tokenSummary.tokenId];
		return valuation
			? { ...tokenSummary, ...valuation }
			: { ...tokenSummary, isLoadingStablePlancks: true };
	});

export const useBalancesByTokenSummaryOf = (
	balances: AccountBalanceWithStable[],
) => {
	const summary = useMemo(
		() => getBalancesByTokenSummary(balances),
		[balances],
	);

	const holdings = useMemo(
		() =>
			values(summary).map(({ tokenId, tokenPlancks }) => ({
				tokenId,
				plancks: tokenPlancks ?? 0n,
			})),
		[summary],
	);
	const { data: valuations } = useHoldingValuations(holdings);

	return useMemo(
		() => valueHoldingsTogether(summary, valuations),
		[summary, valuations],
	);
};

export const useBalancesByTokenSummary = ({
	tokens,
	accounts,
}: UseBalancesByTokenSummaryProps) => {
	const stop = logger.cumulativeTimer("useBalancesByTokenSummary");

	const { data: balances, isLoading } = useBalancesWithStables({
		tokens,
		accounts,
	});

	const data = useBalancesByTokenSummaryOf(balances);

	stop();

	return { data, isLoading };
};
