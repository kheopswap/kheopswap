import { useWallets } from "@kheopskit/react";
import { values } from "lodash-es";
import { useMemo } from "react";
import { useAllTokens } from "../../hooks/useAllTokens";
import { useAssetHubTVL } from "../../hooks/useAssetHubTVL";
import { useBalancesWithStables } from "../../hooks/useBalancesWithStables";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import { PORTFOLIO_TOKEN_TYPES } from "../../registry/tokens/tokens";
import { logger } from "../../utils/logger";
import { provideContext } from "../../utils/provideContext";

export const usePortfolioProvider = () => {
	const stop = logger.cumulativeTimer("usePortfolioProvicer");

	const { accounts } = useWallets();

	const { data: tokensMap, isLoading: isLoadingTokens } = useAllTokens({
		types: PORTFOLIO_TOKEN_TYPES,
	});

	const tokens = useMemo(() => values(tokensMap), [tokensMap]);

	const { data: tvl } = useAssetHubTVL();

	const { data: balances, isLoading: isLoadingBalances } =
		useBalancesWithStables({ tokens, accounts });

	const { data: prices, isLoading: isLoadingPrices } = useTokenPrices();

	stop();

	return {
		isLoading: isLoadingTokens || isLoadingBalances || isLoadingPrices,
		balances,
		accounts,
		tokens,
		tvl,
		prices,
	};
};

export const [PortfolioProvider, usePortfolio] =
	provideContext(usePortfolioProvider);
