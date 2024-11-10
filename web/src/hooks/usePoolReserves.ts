import { useMemo } from "react";

import { useBalance } from "./useBalance";

import type { Pool } from "@kheopswap/services/pools";
import { isBigInt, logger } from "@kheopswap/utils";

type UsePoolReservesProps = {
	pool: Pool | null | undefined;
};

export const usePoolReserves = ({ pool }: UsePoolReservesProps) => {
	const stop = logger.cumulativeTimer("usePoolReserves");
	const { data: reserveNative, isLoading: isLoadingNative } = useBalance({
		address: pool?.owner,
		tokenId: pool?.tokenIds[0],
	});
	const { data: reserveAsset, isLoading: isLoadingAsset } = useBalance({
		address: pool?.owner,
		tokenId: pool?.tokenIds[1],
	});

	const output = useMemo(
		() => ({
			data:
				isBigInt(reserveNative) && isBigInt(reserveAsset)
					? ([reserveNative, reserveAsset] as [bigint, bigint])
					: null,
			isLoading: isLoadingNative || isLoadingAsset,
		}),
		[isLoadingAsset, isLoadingNative, reserveAsset, reserveNative],
	);

	stop();

	return output;
};
