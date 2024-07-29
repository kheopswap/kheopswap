import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

import { ChainId } from "src/config/chains";
import { Pool, getPoolsByChain$ } from "src/services/pools";

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

  return useObservable(pools$, { isLoading: !!chainId, data: [] });
};
