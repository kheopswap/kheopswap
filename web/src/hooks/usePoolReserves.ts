import { useMemo } from "react";

import type { Pool } from "@kheopswap/services/pools";
import { logger } from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import { getAssetHubPoolReserves$ } from "src/state";

type UsePoolReservesProps = {
	pool: Pool | null | undefined;
};

const DEFAULT_VALUE = { data: undefined, isLoading: true };

export const usePoolReserves = ({ pool }: UsePoolReservesProps) => {
	const stop = logger.cumulativeTimer("usePoolReserves");

	const obs = useMemo(
		() =>
			getAssetHubPoolReserves$(pool ?? null).pipe(
				map(({ reserves, isLoading }) => ({ data: reserves, isLoading })),
			),
		[pool],
	);

	const res = useObservable(obs, DEFAULT_VALUE);

	stop();

	return res;

	// const { data: reserveNative, isLoading: isLoadingNative } = useBalance({
	// 	address: pool?.owner,
	// 	tokenId: pool?.tokenIds[0],
	// });
	// const { data: reserveAsset, isLoading: isLoadingAsset } = useBalance({
	// 	address: pool?.owner,
	// 	tokenId: pool?.tokenIds[1],
	// });

	// const output = useMemo(
	// 	() => ({
	// 		data:
	// 			isBigInt(reserveNative) && isBigInt(reserveAsset)
	// 				? ([reserveNative, reserveAsset] as [bigint, bigint])
	// 				: null,
	// 		isLoading: isLoadingNative || isLoadingAsset,
	// 	}),
	// 	[isLoadingAsset, isLoadingNative, reserveAsset, reserveNative],
	// );

	// stop();

	// return output;
};
