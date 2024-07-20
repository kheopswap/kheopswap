import { bind } from "@react-rxjs/core";
import { useEffect, useMemo } from "react";
import { map } from "rxjs";

import { TokenIdsPair } from "src/config/tokens";
import {
  getPoolSupplies$,
  subscribePoolSupplies,
} from "src/services/poolSupplies";

type UsePoolSuppliesProps = {
  pairs: TokenIdsPair[] | undefined;
};
type PoolSupplyState = {
  pair: TokenIdsPair;
  isLoading: boolean;
  supply: bigint | undefined;
};

type UsePoolSuppliesResult = {
  isLoading: boolean;
  data: PoolSupplyState[];
};

const serializePairs = (pairs: TokenIdsPair[] = []): string => {
  return pairs?.map((pair) => pair.join("||")).join(",");
};

const deserializePairs = (strPairs: string = ""): TokenIdsPair[] => {
  return strPairs
    .split(",")
    .filter(Boolean)
    .map((key) => {
      const [tokenId1, tokenId2] = key.split("||");
      return [tokenId1, tokenId2];
    });
};

const [usePoolSuppliesFromPairs] = bind((strPairs: string = "") => {
  const pairs = deserializePairs(strPairs);

  return getPoolSupplies$(pairs).pipe(
    map((poolSupplies) => ({
      data: poolSupplies.map((ps) => ({
        pair: ps.pair,
        supply: ps.supply,
        isLoading: ps.status !== "loaded",
      })),
      isLoading: poolSupplies.some((b) => b.status !== "loaded"),
    })),
  );
});

export const usePoolSupplies = ({
  pairs,
}: UsePoolSuppliesProps): UsePoolSuppliesResult => {
  useEffect(() => {
    if (!pairs) return;

    const unsubscribe = subscribePoolSupplies(pairs);

    return () => {
      unsubscribe();
    };
  }, [pairs]);

  // serialize hook args to prevent infinite re-render loop
  const strPairs = useMemo(() => serializePairs(pairs), [pairs]);

  return usePoolSuppliesFromPairs(strPairs);
};
