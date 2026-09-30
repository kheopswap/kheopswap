import { map } from "rxjs";
import type { ChainId } from "../registry/chains/types";
import { getPoolsByChain$ } from "../services/pools/service";
import type { Pool } from "../services/pools/types";
import { bindSerialized } from "../utils/bindSerialized";

type UsePoolsProps = {
	chainId: ChainId | null | undefined;
};

type UsePoolsResult = {
	isLoading: boolean;
	data: Pool[];
};

const usePoolsByChain = bindSerialized(
	(chainId: ChainId | null) =>
		getPoolsByChain$(chainId).pipe(
			map(
				(statusAndPools): UsePoolsResult => ({
					isLoading: statusAndPools.status !== "loaded",
					data: statusAndPools.pools,
				}),
			),
		),
	(chainId): UsePoolsResult => ({ isLoading: !!chainId, data: [] }),
);

export const usePoolsByChainId = ({ chainId }: UsePoolsProps): UsePoolsResult =>
	usePoolsByChain(chainId ?? null);
