import { bind } from "@react-rxjs/core";
import { values } from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallets } from "../../common/kheopskit";
import { useAllTokens } from "../../hooks/useAllTokens";
import { useAssetHubTVL } from "../../hooks/useAssetHubTVL";
import { useBalancesByTokenSummaryOf } from "../../hooks/useBalancesByTokenSummary";
import { useBalancesWithStables } from "../../hooks/useBalancesWithStables";
import { usePoolsByChainId } from "../../hooks/usePoolsByChainId";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import { PORTFOLIO_TOKEN_TYPES } from "../../registry/tokens/tokens";
import type { TokenId } from "../../registry/tokens/types";
import {
	DISCOVERY_INTERVAL,
	discoverBalances,
	getLastDiscovery,
	getNextDiscoveryDelay,
	recordDiscovery,
} from "../../services/balances/discovery";
import { heldTokenIds$ } from "../../services/balances/service";
import type { BalanceDef } from "../../services/balances/types";
import { useRelayChains } from "../../state/relay";
import { uniqByPublicKey } from "../../utils/accountPublicKey";
import { logger } from "../../utils/logger";
import { provideContext } from "../../utils/provideContext";
import { getWatchedTokens } from "./getWatchedTokens";
import { usePortfolioAllocation } from "./usePortfolioAllocation";

const [useHeldTokenIds] = bind(heldTokenIds$, [] as TokenId[]);

export const usePortfolioProvider = () => {
	const stop = logger.cumulativeTimer("usePortfolioProvider");

	const { accounts: walletAccounts } = useWallets();
	const accounts = useMemo(
		() => uniqByPublicKey(walletAccounts, (account) => account.address),
		[walletAccounts],
	);
	const { assetHub } = useRelayChains();

	const { data: tokensMap, isLoading: isLoadingTokens } = useAllTokens({
		types: PORTFOLIO_TOKEN_TYPES,
	});

	const tokens = useMemo(() => values(tokensMap), [tokensMap]);

	const [search, setSearch] = useState("");

	const { data: pools } = usePoolsByChainId({ chainId: assetHub.id });
	const heldTokenIds = useHeldTokenIds();

	const poolTokenIds = useMemo(
		() => new Set(pools.flatMap((pool) => pool.tokenIds)),
		[pools],
	);

	const watchedTokens = useMemo(
		() =>
			getWatchedTokens({
				tokens,
				poolTokenIds,
				heldTokenIds: new Set(heldTokenIds),
				search,
			}),
		[tokens, poolTokenIds, heldTokenIds, search],
	);

	const discoveryKey = useMemo(
		() =>
			accounts.length
				? [assetHub.id, ...accounts.map((a) => a.address).sort()].join(",")
				: "",
		[assetHub.id, accounts],
	);
	const unwatchedDefs = useRef<BalanceDef[]>([]);
	unwatchedDefs.current = useMemo(() => {
		const watched = new Set(watchedTokens.map((token) => token.id));
		return tokens
			.filter((token) => !watched.has(token.id))
			.flatMap((token) =>
				accounts.map((account) => ({
					address: account.address,
					tokenId: token.id,
				})),
			);
	}, [tokens, watchedTokens, accounts]);

	useEffect(() => {
		if (!discoveryKey || isLoadingTokens) return;
		let cancelled = false;
		let timeout: ReturnType<typeof setTimeout>;
		const run = async () => {
			try {
				await discoverBalances(unwatchedDefs.current);
				recordDiscovery(discoveryKey);
			} catch (err) {
				logger.error("Token discovery failed", { err });
			}
			if (!cancelled) timeout = setTimeout(run, DISCOVERY_INTERVAL);
		};
		timeout = setTimeout(
			run,
			getNextDiscoveryDelay(getLastDiscovery(discoveryKey)),
		);
		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [discoveryKey, isLoadingTokens]);

	const { data: tvl } = useAssetHubTVL();

	const { data: liveBalances, isLoading: isLoadingBalances } =
		useBalancesWithStables({ tokens: watchedTokens, accounts });

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
		isLoadingTokens,
		balances,
		balancesByTokenId,
		allocation,
		holdingsByTokenId,
		lowLiquidityCount,
		unpricedCount,
		accounts,
		tokens,
		poolTokenIds,
		tvl,
		prices,
		search,
		setSearch,
	};
};

export const [PortfolioProvider, usePortfolio] =
	provideContext(usePortfolioProvider);
