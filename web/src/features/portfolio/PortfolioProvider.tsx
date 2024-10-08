import { values } from "lodash";
import { useMemo } from "react";
import { TRADABLE_TOKEN_TYPES } from "src/config/tokens";
import {
	useAllTokens,
	useAssetHubTVL,
	useBalancesWithStables,
	useWallets,
} from "src/hooks";
import { useTokenPrices } from "src/hooks/useTokenPrices";
import { provideContext } from "src/util";

export const usePortfolioProvider = () => {
	const { accounts } = useWallets();

	const { data: tokensMap, isLoading: isLoadingTokens } = useAllTokens({
		types: TRADABLE_TOKEN_TYPES,
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
