import { getTokenId } from "@kheopswap/registry";
import type { BalanceDef } from "@kheopswap/services/balances";
import { isBigInt } from "@kheopswap/utils";
import { isEqual } from "lodash-es";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useBalances, usePoolSupplies } from "src/hooks";
import type { PoolWithValuation } from "./usePoolsWithValuation";

type UsePoolWithPositionsProps = {
	pools: PoolWithValuation[] | undefined;
	addresses: SS58String[];
};

export type PoolWithPositions = PoolWithValuation & {
	positions: {
		address: SS58String;
		shares: bigint | null;
		supply: bigint | null;
		valuation: bigint | null;
		isLoading: boolean;
	}[];
	totalPositionsValuation: bigint;
	isLoadingPositions: boolean;
};

type UsePoolWithPositionsResult = {
	data: PoolWithPositions[];
	isLoading: boolean;
};

export const usePoolWithPositions = ({
	pools,
	addresses,
}: UsePoolWithPositionsProps): UsePoolWithPositionsResult => {
	const poolTokenIds = useMemo(
		() =>
			pools?.map((pool) =>
				getTokenId({
					type: "pool-asset",
					chainId: pool?.chainId,
					poolAssetId: pool?.poolAssetId,
				}),
			) ?? [],
		[pools],
	);

	const sharesBalanceDefs = useMemo<BalanceDef[]>(
		() =>
			poolTokenIds.flatMap((tokenId) =>
				addresses.map((address) => ({
					address,
					tokenId,
				})),
			),
		[poolTokenIds, addresses],
	);

	// Use poll mode for pool positions - informational display
	const { data: lpShares, isLoading: isLoadingLpShares } = useBalances({
		balanceDefs: sharesBalanceDefs,
		mode: "poll",
	});

	const pairs = useMemo(
		() => pools?.map((pool) => pool.tokenIds) ?? [],
		[pools],
	);

	const { data: poolSupplies, isLoading: isLoadingPoolSupplies } =
		usePoolSupplies({ pairs });

	const isLoading = useMemo(
		() => isLoadingLpShares || isLoadingPoolSupplies,
		[isLoadingLpShares, isLoadingPoolSupplies],
	);

	const data = useMemo(() => {
		// for each pool, breakdown of positions by address
		return (
			pools?.map((pool) => {
				const poolTokenId = getTokenId({
					type: "pool-asset",
					chainId: pool.chainId,
					poolAssetId: pool.poolAssetId,
				});

				// valuation by address for that pool, based on the shares owned by the address and the total supply
				const positions = addresses.map((address) => {
					const addressShares = lpShares?.find(
						({ address: a, tokenId }) =>
							a === address && tokenId === poolTokenId,
					);
					const isLoadingShares = !!addressShares?.isLoading;
					const shares = addressShares?.balance ?? null;

					const poolSupply = poolSupplies.find((ps) =>
						isEqual(ps.pair, pool.tokenIds),
					);
					const isLoadingSupply = !!poolSupply?.isLoading;
					const supply = poolSupply?.supply ?? null;

					const res = {
						isLoading: isLoadingShares || isLoadingSupply,
						address,
						shares,
						supply,
						valuation:
							isBigInt(pool.valuation) &&
							isBigInt(shares) &&
							isBigInt(supply) &&
							supply > 0n
								? (pool.valuation * shares) / supply
								: null,
					};

					return res;
				});

				const poolWithPosition: PoolWithPositions = {
					...pool,
					positions,
					totalPositionsValuation: positions.reduce(
						(acc, p) => acc + (p.valuation ?? 0n),
						0n,
					),
					isLoadingPositions: positions.some((p) => p.isLoading),
				};

				return poolWithPosition;
			}) ?? []
		);
	}, [lpShares, poolSupplies, addresses, pools]);

	return { data, isLoading };
};
