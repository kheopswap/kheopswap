import type { SS58String } from "polkadot-api";
import { useMemo } from "react";

import { isBigInt } from "@kheopswap/utils";
import { useBalance } from "src/hooks";
import type { Pool } from "src/services/pools";

type AccountBalancesForPool = {
	pool: Pool | null;
	address: SS58String | null;
};

export const useAccountBalancesForPool = ({
	pool,
	address,
}: AccountBalancesForPool) => {
	const { data: reserveNative, isLoading: isLoadingNative } = useBalance({
		address,
		tokenId: pool?.tokenIds[0],
	});
	const { data: reserveAsset, isLoading: isLoadingAsset } = useBalance({
		address,
		tokenId: pool?.tokenIds[1],
	});

	return useMemo(
		() => ({
			data:
				isBigInt(reserveNative) && isBigInt(reserveAsset)
					? ([reserveNative, reserveAsset] as [bigint, bigint])
					: null,
			isLoading: isLoadingNative || isLoadingAsset,
		}),
		[isLoadingAsset, isLoadingNative, reserveAsset, reserveNative],
	);
};
