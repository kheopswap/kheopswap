import { useMemo } from "react";
import { map } from "rxjs";
import type { ChainId } from "../registry/chains/types";
import { getPoolsByChain$ } from "../services/pools/service";
import type { Pool } from "../services/pools/types";
import { useSyncObservableWithDefault } from "./useSyncObservableWithDefault";

type UsePoolsProps = {
	chainId: ChainId | null | undefined;
};

type UsePoolsResult = {
	isLoading: boolean;
	data: Pool[];
};

export const usePoolsByChainId = ({
	chainId,
}: UsePoolsProps): UsePoolsResult => {
	const pools$ = useMemo(
		() =>
			getPoolsByChain$(chainId ?? null).pipe(
				map((statusAndPools) => ({
					isLoading: statusAndPools.status !== "loaded",
					data: statusAndPools.pools,
				})),
			),
		[chainId],
	);

	const defaultValue = useMemo(
		() => ({ isLoading: !!chainId, data: [] }),
		[chainId],
	);

	return useSyncObservableWithDefault(pools$, defaultValue);
};
