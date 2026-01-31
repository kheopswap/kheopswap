import type { PolkadotAccount } from "@kheopskit/core";
import type { Token, TokenId } from "@kheopswap/registry";
import type { BalanceSubscriptionMode } from "@kheopswap/services/balances";
import { logger } from "@kheopswap/utils";
import { groupBy, keys } from "lodash-es";
import { useMemo } from "react";
import type {
	AccountBalanceWithStable,
	BalanceWithStableSummary,
} from "src/types";
import { useBalancesWithStables } from "./useBalancesWithStables";

type UseBalancesByTokenSummaryProps = {
	tokens: Token[] | TokenId[] | null | undefined;
	accounts: PolkadotAccount[] | string[] | null | undefined;
	/** Subscription mode: "live" for real-time updates, "poll" for periodic updates (default: "live") */
	mode?: BalanceSubscriptionMode;
};

export const getBalancesByTokenSummary = (
	balances: AccountBalanceWithStable[],
) => {
	const balancesByTokenId = groupBy(balances, "tokenId");

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
			const hasStablePlancks = tokenBalances.some(
				(b) => b.stablePlancks !== null,
			);
			const stablePlancks = hasStablePlancks
				? tokenBalances.reduce(
						(acc, { stablePlancks }) => acc + (stablePlancks ?? 0n),
						0n,
					)
				: null;
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
				stablePlancks,
				isLoadingStablePlancks,
				isInitializing,
			};
			return acc;
		},
		{} as Record<TokenId, BalanceWithStableSummary>,
	);
};

export const useBalancesByTokenSummary = ({
	tokens,
	accounts,
	mode,
}: UseBalancesByTokenSummaryProps) => {
	const stop = logger.cumulativeTimer("useBalancesByTokenSummary");

	const { data: balances, isLoading } = useBalancesWithStables({
		tokens,
		accounts,
		mode,
	});

	const data = useMemo(() => getBalancesByTokenSummary(balances), [balances]);

	stop();

	return { data, isLoading };
};
