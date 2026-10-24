import { groupBy, mapValues, toPairs, values } from "lodash-es";
import { useMemo } from "react";
import type { Token, TokenId } from "../registry/tokens/types";
import { useRelayChains } from "../state/relay";
import type { BalanceWithStableSummary } from "../types/balances";
import { valuationOf } from "../utils/getHoldingValuation";
import { isBigInt } from "../utils/isBigInt";
import { logger } from "../utils/logger";
import { useBalances } from "./useBalances";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useStablePlancksMulti } from "./useStablePlancksMulti";
import { useTokensByChainIds } from "./useTokensByChainIds";

type UseAssetHubTVLResult = {
	isLoading: boolean;
	data: BalanceWithStableSummary[];
};

type LockedToken = {
	tokenId: TokenId;
	plancks: bigint;
	isLoading: boolean;
	isInitializing: boolean;
};

type StableValue = {
	stablePlancks: bigint | null;
	isLoadingStablePlancks: boolean;
};

export const getTvlRows = ({
	tokens,
	lockedTokens,
	stableValues,
	isLoadingInputs,
}: {
	tokens: Token[];
	lockedTokens: LockedToken[];
	stableValues: StableValue[];
	isLoadingInputs: boolean;
}): BalanceWithStableSummary[] =>
	tokens.map((token) => {
		const lockedIdx = lockedTokens.findIndex((t) => t.tokenId === token.id);
		const locked = lockedTokens[lockedIdx];
		const stable = stableValues[lockedIdx];
		return {
			tokenId: token.id,
			tokenPlancks: locked?.plancks ?? null,
			isInitializing: locked?.isInitializing ?? isLoadingInputs,
			isLoadingTokenPlancks: locked?.isLoading ?? isLoadingInputs,
			isLoadingStablePlancks: stable?.isLoadingStablePlancks ?? !!locked,
			...valuationOf(stable?.stablePlancks ?? null),
		};
	});

export const useAssetHubTVL = (): UseAssetHubTVLResult => {
	const stop = logger.cumulativeTimer("useAssetHubTVL");

	const { assetHub } = useRelayChains();
	const { data: tokens, isLoading: isLoadingTokens } = useTokensByChainIds({
		chainIds: [assetHub.id],
	});

	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const allPoolsReservesBalanceDefs = useMemo(
		() =>
			pools?.flatMap((pool) =>
				pool.tokenIds.map((tokenId) => ({
					address: pool.owner,
					tokenId,
				})),
			) ?? [],
		[pools],
	);

	const { data: lockedBalances, isLoading: isLoadingBalances } = useBalances({
		balanceDefs: allPoolsReservesBalanceDefs,
	});

	const lockedTokens = useMemo<LockedToken[]>(
		() =>
			toPairs(
				mapValues(groupBy(lockedBalances, "tokenId"), (tokenBalances) =>
					tokenBalances.reduce(
						(acc, { balance, isLoading }) => {
							acc.plancks += balance ?? 0n;
							acc.isLoading = acc.isLoading || isLoading;
							acc.isInitializing =
								acc.isInitializing || (!isBigInt(balance) && isLoading);
							return acc;
						},
						{ plancks: 0n, isLoading: false, isInitializing: false },
					),
				),
			).map(([tokenId, summary]) => ({ tokenId, ...summary })),
		[lockedBalances],
	);

	const { data: stableValues, isLoading: isLoadingStableValues } =
		useStablePlancksMulti({ inputs: lockedTokens });

	const isLoadingInputs =
		isLoadingTokens || isLoadingBalances || isLoadingPools;

	const tvl = useMemo(
		() => ({
			isLoading: isLoadingInputs || isLoadingStableValues,
			data: getTvlRows({
				tokens: values(tokens),
				lockedTokens,
				stableValues,
				isLoadingInputs,
			}),
		}),
		[
			isLoadingInputs,
			isLoadingStableValues,
			lockedTokens,
			stableValues,
			tokens,
		],
	);

	stop();

	return tvl;
};
