import { useMemo } from "react";

import type { Pool } from "@kheopswap/services/pools";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import { getAssetHubPoolReserves$ } from "src/state";

type UsePoolReservesProps = {
	pool: Pool | null | undefined;
};

const DEFAULT_VALUE = { data: undefined, isLoading: true };

export const usePoolReserves = ({ pool }: UsePoolReservesProps) => {
	const obs = useMemo(
		() =>
			getAssetHubPoolReserves$(pool ?? null).pipe(
				map(({ reserves, isLoading }) => ({ data: reserves, isLoading })),
			),
		[pool],
	);

	return useObservable(obs, DEFAULT_VALUE);
};
