import type { ChainId } from "@kheopswap/registry";
import { getPoolsByChain$, type Pool } from "@kheopswap/services/pools";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

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
		() => ({ isLoading: !chainId, data: [] }),
		[chainId],
	);

	return useObservable(pools$, defaultValue);
};
