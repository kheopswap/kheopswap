import type { Pool } from "@kheopswap/services/pools";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import { getAssetHubPoolReserves$ } from "src/state";
import type { LoadingState } from "src/types";

type UsePoolReservesProps = {
	pool: Pool | null | undefined;
};

type UsePoolReservesResult = LoadingState<[bigint, bigint] | null>;

const DEFAULT_VALUE: UsePoolReservesResult = {
	data: null,
	isLoading: true,
};

// bind() with factory function for parameterized observable
const [usePoolReservesInternal] = bind(
	(pool: Pool | null) =>
		getAssetHubPoolReserves$(pool).pipe(
			map(({ reserves, isLoading }) => ({ data: reserves, isLoading })),
		),
	DEFAULT_VALUE,
);

export const usePoolReserves = ({
	pool,
}: UsePoolReservesProps): UsePoolReservesResult => {
	return usePoolReservesInternal(pool ?? null);
};
