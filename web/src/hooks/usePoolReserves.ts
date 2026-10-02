import { map } from "rxjs";
import { getAssetHubPoolReserves$ } from "../services/pools/reserves";
import type { Pool } from "../services/pools/types";
import { bindSerialized } from "../utils/bindSerialized";

type UsePoolReservesProps = {
	pool: Pool | null | undefined;
};

type UsePoolReservesResult = {
	data: [bigint, bigint] | null | undefined;
	isLoading: boolean;
};

const usePoolReservesByPool = bindSerialized(
	({ pool }: { pool: Pool | null }) =>
		getAssetHubPoolReserves$(pool).pipe(
			map(
				({ reserves, isLoading }): UsePoolReservesResult => ({
					data: reserves,
					isLoading,
				}),
			),
		),
	(): UsePoolReservesResult => ({ data: undefined, isLoading: true }),
);

export const usePoolReserves = ({
	pool,
}: UsePoolReservesProps): UsePoolReservesResult =>
	usePoolReservesByPool({ pool: pool ?? null });
