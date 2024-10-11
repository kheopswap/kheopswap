import type { SS58String } from "polkadot-api";
import { useMemo } from "react";

import { isBigInt } from "@kheopswap/utils";
import { getTokenId } from "src/config/tokens";
import { useBalance, usePoolSupply } from "src/hooks";
import type { Pool } from "src/services/pools";

type UsePoolPositionProps = {
	pool: Pool | null;
	address: SS58String | null;
	reserves: [bigint, bigint] | null;
	isLoadingReserves: boolean;
};

export const usePoolPosition = ({
	pool,
	reserves,
	address,
	isLoadingReserves,
}: UsePoolPositionProps) => {
	const [tokenId1, tokenId2] = useMemo(
		() => pool?.tokenIds || [undefined, undefined],
		[pool?.tokenIds],
	);

	const poolTokenId = useMemo(
		() =>
			pool
				? getTokenId({
						type: "pool-asset",
						chainId: pool?.chainId,
						poolAssetId: pool?.poolAssetId,
					})
				: null,
		[pool],
	);

	const { data: lpShares, isLoading: isLoadingLpShares } = useBalance({
		address,
		tokenId: poolTokenId,
	});

	const { data: supply, isLoading: isLoadingSupply } = usePoolSupply({
		tokenId1,
		tokenId2,
	});

	const isLoading = useMemo(
		() => isLoadingLpShares || isLoadingReserves || isLoadingSupply,
		[isLoadingLpShares, isLoadingReserves, isLoadingSupply],
	);

	const data = useMemo(
		() =>
			isBigInt(lpShares) && isBigInt(supply) && reserves && supply > 0n
				? {
						shares: lpShares,
						supply,
						reserves: [
							(reserves[0] * lpShares) / supply,
							(reserves[1] * lpShares) / supply,
						] as const,
					}
				: null,
		[lpShares, supply, reserves],
	);

	return { data, isLoading };
};
