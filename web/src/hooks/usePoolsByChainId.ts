import { bind } from "@react-rxjs/core";
import { useEffect } from "react";
import { map } from "rxjs";

import { ChainId } from "src/config/chains";
import {
  Pool,
  getPoolsByChain$,
  subscribePoolsByChain,
} from "src/services/pools";

type UsePoolsProps = {
  chainId: ChainId | null | undefined;
};

type UsePoolsResult = {
  isLoading: boolean;
  data: Pool[];
};

const [usePoolsByChain] = bind((chainId: ChainId | null | undefined) => {
  return getPoolsByChain$(chainId ?? null).pipe(
    map((statusAndPools) => ({
      isLoading: statusAndPools.status !== "loaded",
      data: statusAndPools.pools,
    })),
  );
});

export const usePoolsByChainId = ({
  chainId,
}: UsePoolsProps): UsePoolsResult => {
  useEffect(() => {
    if (!chainId) return;

    const unsubscribe = subscribePoolsByChain(chainId);

    return () => {
      unsubscribe();
    };
  }, [chainId]);

  return usePoolsByChain(chainId);
};
