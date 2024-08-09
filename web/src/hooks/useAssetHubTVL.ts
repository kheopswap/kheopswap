import { groupBy, mapValues, toPairs, values } from "lodash";
import { useMemo } from "react";

import { useBalances } from "./useBalances";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useRelayChains } from "./useRelayChains";
import { useStablePlancksMulti } from "./useStablePlancksMulti";
import { useTokensByChainIds } from "./useTokensByChainIds";

import type { BalanceWithStableSummary } from "src/types";
import { isBigInt } from "src/util";

type UseAssetHubTVLResult = {
	isLoading: boolean;
	data: BalanceWithStableSummary[];
};

export const useAssetHubTVL = (): UseAssetHubTVLResult => {
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

	const lockedTokens = useMemo(
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

	const { data: assetConvertPlancks, isLoading: isLoadingAssetConvertPlancks } =
		useStablePlancksMulti({
			inputs: lockedTokens,
		});

	return useMemo(
		() => ({
			isLoading:
				isLoadingTokens ||
				isLoadingBalances ||
				isLoadingPools ||
				isLoadingAssetConvertPlancks,
			data: values(tokens).map((token) => {
				const lockedIdx = lockedTokens.findIndex((t) => t.tokenId === token.id);
				const locked = lockedTokens[lockedIdx];
				return {
					tokenId: token.id,
					tokenPlancks: locked?.plancks ?? null,
					isInitializing:
						locked?.isInitializing ??
						(isLoadingBalances || isLoadingPools || isLoadingTokens),
					isLoadingTokenPlancks:
						locked?.isLoading ||
						(!isBigInt(locked?.plancks) && isLoadingTokens),
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					...assetConvertPlancks[lockedIdx]!,
				};
			}),
		}),
		[
			assetConvertPlancks,
			isLoadingAssetConvertPlancks,
			isLoadingBalances,
			isLoadingPools,
			isLoadingTokens,
			lockedTokens,
			tokens,
		],
	);
};
