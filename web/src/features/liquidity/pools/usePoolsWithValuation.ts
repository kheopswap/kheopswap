import type { Token } from "@kheopswap/registry";
import type { Pool } from "@kheopswap/services/pools";
import { isBigInt, logger } from "@kheopswap/utils";
import { useMemo } from "react";
import { getPoolReserves } from "src/helpers/getPoolReserves";
import { getAssetConvertPlancks } from "src/util/getAssetConvertPlancks";
import { useBalances } from "../../../hooks/useBalances";

export type PoolWithValuation = Pool & {
	valuation: bigint | null;
};

type UsePoolsWithValuationProps = {
	pools: Pool[] | null | undefined;
	tokens: Record<string, Token> | null | undefined;
	nativeToken: Token | null | undefined;
	stableToken: Token | null | undefined;
};

export const usePoolsWithValuation = ({
	pools,
	tokens,
	nativeToken,
	stableToken,
}: UsePoolsWithValuationProps) => {
	const stop = logger.cumulativeTimer("usePoolsWithValuation");

	const poolsBalanceDefs = useMemo(
		() =>
			pools?.flatMap((pool) =>
				pool.tokenIds.map((tokenId) => ({
					address: pool.owner,
					tokenId,
				})),
			) ?? [],
		[pools],
	);

	// Use poll mode for pool reserves display - informational
	const { data: allReservesBalances, isLoading } = useBalances({
		balanceDefs: poolsBalanceDefs,
		mode: "poll",
	});

	const reservesNativeToStable = useMemo(
		() => getPoolReserves(pools, allReservesBalances, nativeToken, stableToken),
		[allReservesBalances, nativeToken, pools, stableToken],
	);

	const poolsWithStablePrices = useMemo(() => {
		if (!reservesNativeToStable) return [];

		return pools?.map<PoolWithValuation>((pool) => {
			const poolBalances = allReservesBalances?.filter(
				(balance) => balance.address === pool.owner,
			);

			const stablePrices = poolBalances?.map(({ balance, tokenId }) => {
				const token = tokens?.[tokenId];
				const reservesNativeToToken =
					tokenId === nativeToken?.id
						? ([1n, 1n] as [bigint, bigint])
						: getPoolReserves(pools, allReservesBalances, nativeToken, token);

				if (
					!token ||
					!isBigInt(balance) ||
					!nativeToken ||
					!stableToken ||
					!reservesNativeToStable ||
					!reservesNativeToToken
				)
					return null;

				return getAssetConvertPlancks(
					balance,
					token.id,
					nativeToken.id,
					stableToken.id,
					reservesNativeToToken,
					reservesNativeToStable,
				);
			});

			const valuation =
				stablePrices?.length && stablePrices.every(isBigInt)
					? stablePrices.reduce((acc, val) => acc + val, 0n)
					: null;

			return { ...pool, valuation };
		});
	}, [
		allReservesBalances,
		nativeToken,
		pools,
		reservesNativeToStable,
		stableToken,
		tokens,
	]);

	stop();

	return { data: poolsWithStablePrices, isLoading };
};
