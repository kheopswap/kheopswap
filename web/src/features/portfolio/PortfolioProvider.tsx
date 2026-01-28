import { PORTFOLIO_TOKEN_TYPES } from "@kheopswap/registry";
import { logger, provideContext } from "@kheopswap/utils";
import { values } from "lodash-es";
import { useMemo } from "react";
import {
	useAllTokens,
	useAssetHubTVL,
	useBalancesWithStables,
	useTokenPrices,
	useWallets,
} from "src/hooks";

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
