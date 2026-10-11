import { values } from "lodash-es";
import { useMemo, useRef } from "react";
import { useWallets } from "../../common/kheopskit";
import { useAllTokens } from "../../hooks/useAllTokens";
import { useAssetHubTVL } from "../../hooks/useAssetHubTVL";
import { getBalancesByTokenSummary } from "../../hooks/useBalancesByTokenSummary";
import { useBalancesWithStables } from "../../hooks/useBalancesWithStables";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import { PORTFOLIO_TOKEN_TYPES } from "../../registry/tokens/tokens";
import { logger } from "../../utils/logger";
import { provideContext } from "../../utils/provideContext";
import { usePortfolioAllocation } from "./usePortfolioAllocation";

export const usePortfolioProvider = () => {
	const stop = logger.cumulativeTimer("usePortfolioProvicer");

	const { accounts } = useWallets();

	const { data: tokensMap, isLoading: isLoadingTokens } = useAllTokens({
		types: PORTFOLIO_TOKEN_TYPES,
	});

	const tokens = useMemo(() => values(tokensMap), [tokensMap]);

	const { data: tvl } = useAssetHubTVL();

	const { data: liveBalances, isLoading: isLoadingBalances } =
		useBalancesWithStables({ tokens, accounts });

	const lastBalances = useRef(liveBalances);
	if (liveBalances.length || !accounts.length)
		lastBalances.current = liveBalances;
	const balances = lastBalances.current;

	const { data: prices, isLoading: isLoadingPrices } = useTokenPrices();

	const balancesByTokenId = useMemo(
		() => getBalancesByTokenSummary(balances),
		[balances],
	);

	const { allocation, holdingsByTokenId } = usePortfolioAllocation({
		tokens,
		balancesByTokenId,
	});

	stop();

	return {
		isLoading: isLoadingTokens || isLoadingBalances || isLoadingPrices,
		balances,
		balancesByTokenId,
		allocation,
		holdingsByTokenId,
		accounts,
		tokens,
		tvl,
		prices,
	};
};

export const [PortfolioProvider, usePortfolio] =
	provideContext(usePortfolioProvider);
