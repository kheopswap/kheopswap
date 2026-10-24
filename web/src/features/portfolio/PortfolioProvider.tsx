import { bind } from "@react-rxjs/core";
import { uniq, values } from "lodash-es";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useWallets } from "../../common/kheopskit";
import { useAllTokens } from "../../hooks/useAllTokens";
import { useAssetHubTVL } from "../../hooks/useAssetHubTVL";
import { useBalancesByTokenSummaryOf } from "../../hooks/useBalancesByTokenSummary";
import { useBalancesWithStables } from "../../hooks/useBalancesWithStables";
import { usePoolsByChainId } from "../../hooks/usePoolsByChainId";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import { PORTFOLIO_TOKEN_TYPES } from "../../registry/tokens/tokens";
import type { TokenId } from "../../registry/tokens/types";
import { heldTokenIds$ } from "../../services/balances/service";
import { useRelayChains } from "../../state/relay";
import { logger } from "../../utils/logger";
import { provideContext } from "../../utils/provideContext";
import { getWatchedTokens } from "./getWatchedTokens";
import { usePortfolioAllocation } from "./usePortfolioAllocation";

const [useHeldTokenIds] = bind(heldTokenIds$, [] as TokenId[]);

const DISCOVERED_ACCOUNTS = new Set<string>();

export const usePortfolioProvider = () => {
	const stop = logger.cumulativeTimer("usePortfolioProvider");

	const { accounts } = useWallets();
	const { assetHub } = useRelayChains();

	const { data: tokensMap, isLoading: isLoadingTokens } = useAllTokens({
		types: PORTFOLIO_TOKEN_TYPES,
	});

	const tokens = useMemo(() => values(tokensMap), [tokensMap]);

	const [search, setSearch] = useState("");

	const { data: pools } = usePoolsByChainId({ chainId: assetHub.id });
	const heldTokenIds = useHeldTokenIds();

	const discoveryKey = useMemo(
		() =>
			accounts.length
				? [
						assetHub.id,
						...uniq(accounts.map((account) => account.address)).sort(),
					].join(",")
				: "",
		[assetHub.id, accounts],
	);
	const [, rerender] = useReducer((n: number) => n + 1, 0);
	const isDiscovering =
		!!discoveryKey && !DISCOVERED_ACCOUNTS.has(discoveryKey);

	const watchedTokens = useMemo(
		() =>
			isDiscovering
				? tokens
				: getWatchedTokens({
						tokens,
						poolTokenIds: new Set(pools.flatMap((pool) => pool.tokenIds)),
						heldTokenIds: new Set(heldTokenIds),
						search,
					}),
		[isDiscovering, tokens, pools, heldTokenIds, search],
	);

	const { data: tvl } = useAssetHubTVL();

	const { data: liveBalances, isLoading: isLoadingBalances } =
		useBalancesWithStables({ tokens: watchedTokens, accounts });

	useEffect(() => {
		if (
			!isDiscovering ||
			isLoadingTokens ||
			isLoadingBalances ||
			!liveBalances.length
		)
			return;
		DISCOVERED_ACCOUNTS.add(discoveryKey);
		rerender();
	}, [
		isDiscovering,
		isLoadingTokens,
		isLoadingBalances,
		liveBalances.length,
		discoveryKey,
	]);

	const lastBalances = useRef(liveBalances);
	if (liveBalances.length || !accounts.length)
		lastBalances.current = liveBalances;
	const balances = lastBalances.current;

	const { data: prices, isLoading: isLoadingPrices } = useTokenPrices();

	const balancesByTokenId = useBalancesByTokenSummaryOf(balances);

	const { allocation, holdingsByTokenId, lowLiquidityCount, unpricedCount } =
		usePortfolioAllocation({ tokens, balancesByTokenId });

	stop();

	return {
		isLoading: isLoadingTokens || isLoadingBalances || isLoadingPrices,
		balances,
		balancesByTokenId,
		allocation,
		holdingsByTokenId,
		lowLiquidityCount,
		unpricedCount,
		accounts,
		tokens,
		tvl,
		prices,
		search,
		setSearch,
	};
};

export const [PortfolioProvider, usePortfolio] =
	provideContext(usePortfolioProvider);
