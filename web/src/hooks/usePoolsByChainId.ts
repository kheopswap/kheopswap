import type { ChainId } from "@kheopswap/registry";
import { getPoolsByChain$, type Pool } from "@kheopswap/services/pools";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import type { LoadingState } from "src/types";

type UsePoolsProps = {
	chainId: ChainId | null | undefined;
};

type UsePoolsResult = LoadingState<Pool[]>;

// bind() with factory function for parameterized observable
const [usePoolsByChainIdInternal] = bind(
	(chainId: ChainId | null) =>
		getPoolsByChain$(chainId).pipe(
			map((statusAndPools) => ({
				isLoading: statusAndPools.status !== "loaded",
				data: statusAndPools.pools,
			})),
		),
	// Default value factory
	(chainId): UsePoolsResult => ({ isLoading: !!chainId, data: [] }),
);

export const usePoolsByChainId = ({
	chainId,
}: UsePoolsProps): UsePoolsResult => {
	return usePoolsByChainIdInternal(chainId ?? null);
};
