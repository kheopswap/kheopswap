import { useMemo } from "react";
import type { Token, TokenId } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";
import { isLowLiquidity } from "../../utils/getHoldingValuation";
import { getTokenLogoColor } from "../../utils/tokenLogo";
import {
	getAllocation,
	getAllocationColors,
	getShare,
	sortByStablePlancksDesc,
	TEXT_COLOR,
} from "./getAllocation";

export type PortfolioHolding = { share: number; color: string };

export const countExcludedHoldings = (balances: BalanceWithStableSummary[]) => {
	const held = balances.filter((balance) => !!balance.tokenPlancks);
	return {
		lowLiquidityCount: held.filter((b) => isLowLiquidity(b.status)).length,
		unpricedCount: held.filter(
			(b) => b.status === "unpriced" && !b.isLoadingStablePlancks,
		).length,
	};
};

export const usePortfolioAllocation = ({
	tokens,
	balancesByTokenId,
}: {
	tokens: Token[];
	balancesByTokenId: Record<TokenId, BalanceWithStableSummary>;
}) => {
	const holdings = useMemo(
		() =>
			tokens
				.flatMap((token) => {
					const stablePlancks = balancesByTokenId[token.id]?.stablePlancks;
					return stablePlancks ? [{ token, stablePlancks }] : [];
				})
				.sort(sortByStablePlancksDesc),
		[tokens, balancesByTokenId],
	);

	const allocation = useMemo(() => getAllocation(holdings), [holdings]);

	const { lowLiquidityCount, unpricedCount } = useMemo(
		() =>
			countExcludedHoldings(
				tokens.flatMap((token) => balancesByTokenId[token.id] ?? []),
			),
		[tokens, balancesByTokenId],
	);

	const holdingsByTokenId = useMemo(() => {
		const colors = getAllocationColors(
			holdings.map(({ token }) => getTokenLogoColor(token.logo)),
		);
		return Object.fromEntries(
			holdings.map(({ token, stablePlancks }, index) => [
				token.id,
				{
					share: getShare(stablePlancks, allocation.total),
					color: colors[index] ?? TEXT_COLOR,
				},
			]),
		) as Record<TokenId, PortfolioHolding>;
	}, [holdings, allocation.total]);

	return { allocation, holdingsByTokenId, lowLiquidityCount, unpricedCount };
};
