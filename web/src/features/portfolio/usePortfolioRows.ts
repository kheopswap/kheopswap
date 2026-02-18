import { keyBy, values } from "lodash-es";
import { useMemo } from "react";
import { getBalancesByTokenSummary } from "../../hooks/useBalancesByTokenSummary";
import { logger } from "../../utils/logger";
import { usePortfolio } from "./PortfolioProvider";
import type { PortfolioRowData } from "./types";

export const usePortfolioRows = () => {
	const stop = logger.cumulativeTimer("usePortfolioRows");

	const { balances, tokens, tvl, prices } = usePortfolio();

	const balancesByTokenId = useMemo(
		() => getBalancesByTokenSummary(balances),
		[balances],
	);

	const portfolioRows = useMemo(() => {
		const tvlByTokenId = keyBy(tvl, "tokenId");
		const priceByTokenId = keyBy(prices, "tokenId");
		return values(tokens).map<PortfolioRowData>((token) => {
			return {
				token,
				balance: balancesByTokenId[token.id] ?? null,
				tvl: tvlByTokenId[token.id] ?? null,
				price: priceByTokenId[token.id] ?? null,
			};
		});
	}, [tvl, balancesByTokenId, prices, tokens]);

	stop();

	return portfolioRows;
};
