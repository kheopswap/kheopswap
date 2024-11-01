import { PORTFOLIO_TOKEN_TYPES } from "@kheopswap/registry";
import { provideContext } from "@kheopswap/utils";
import { values } from "lodash";
import { useMemo } from "react";
import {
	useAllTokens,
	useAssetHubTVL,
	useBalancesWithStables,
	useWallets,
} from "src/hooks";
import { useTokenPrices } from "src/hooks/useTokenPrices";

export const usePortfolioProvider = () => {
	const { accounts } = useWallets();

	const { data: tokensMap, isLoading: isLoadingTokens } = useAllTokens({
		types: PORTFOLIO_TOKEN_TYPES,
	});

	const tokens = useMemo(() => values(tokensMap), [tokensMap]);

	const { data: tvl } = useAssetHubTVL();

	const { data: balances, isLoading: isLoadingBalances } =
		useBalancesWithStables({ tokens, accounts });

	const { data: prices, isLoading: isLoadingPrices } = useTokenPrices();

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
