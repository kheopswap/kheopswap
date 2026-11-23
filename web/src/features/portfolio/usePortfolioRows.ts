import { keyBy } from "es-toolkit";
import { useMemo } from "react";
import { logger } from "../../utils/logger";
import { usePortfolio } from "./PortfolioProvider";
import type { PortfolioRowData } from "./types";

export const usePortfolioRows = () => {
	const stop = logger.cumulativeTimer("usePortfolioRows");

	const { balancesByTokenId, tokens, tvl, prices } = usePortfolio();

	const portfolioRows = useMemo(() => {
		const tvlByTokenId = keyBy(tvl, (item) => item.tokenId);
		const priceByTokenId = keyBy(prices, (item) => item.tokenId);
		return Object.values(tokens).map<PortfolioRowData>((token) => {
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
