import { useMemo } from "react";
import { keyBy } from "lodash";

import { usePortfolio } from "./PortfolioProvider";
import { PortfolioRowData } from "./types";

import { getBalancesByTokenSummary } from "src/hooks";

export const usePortfolioRows = () => {
	const { balances, tokens, tvl, prices } = usePortfolio();

	const balancesByTokenId = useMemo(
		() => getBalancesByTokenSummary(balances),
		[balances],
	);

	return useMemo(() => {
		const tvlByTokenId = keyBy(tvl, "tokenId");
		const priceByTokenId = keyBy(prices, "tokenId");
		return tokens.map<PortfolioRowData>((token) => {
			return {
				token,
				balance: balancesByTokenId[token.id] ?? null,
				tvl: tvlByTokenId[token.id] ?? null,
				price: priceByTokenId[token.id] ?? null,
			};
		});
	}, [tvl, balancesByTokenId, prices, tokens]);
};
