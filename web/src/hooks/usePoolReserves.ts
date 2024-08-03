import { useMemo } from "react";

import { useBalance } from "./useBalance";

import type { Pool } from "src/services/pools";
import { isBigInt } from "src/util";

type UsePoolReservesProps = {
	pool: Pool | null | undefined;
};

export const usePoolReserves = ({ pool }: UsePoolReservesProps) => {
	const { data: reserveNative, isLoading: isLoadingNative } = useBalance({
		address: pool?.owner,
		tokenId: pool?.tokenIds[0],
	});
	const { data: reserveAsset, isLoading: isLoadingAsset } = useBalance({
		address: pool?.owner,
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
