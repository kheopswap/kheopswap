import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import type { Pool } from "../services/pools/types";
import { getAssetHubPoolReserves$ } from "../state/pools";

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
