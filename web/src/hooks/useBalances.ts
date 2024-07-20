import { useEffect, useMemo } from "react";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";

import {
  getBalances$,
  subscribeBalances,
  BalanceDef,
} from "src/services/balances";

type UseBalancesProps = {
  balanceDefs: BalanceDef[] | undefined;
};

export type BalanceState = BalanceDef & {
  balance: bigint | undefined;
  isLoading: boolean;
};

type UseBalancesResult = {
  data: BalanceState[] | undefined;
  isLoading: boolean;
};

const serializeBalanceDefs = (balanceDefs: BalanceDef[] = []): string => {
  return balanceDefs
    ?.map(({ address, tokenId }) => `${address}||${tokenId}`)
    .join(",");
};

const deserializeBalanceDefs = (strBalanceDefs: string = ""): BalanceDef[] => {
  return strBalanceDefs
    .split(",")
    .filter(Boolean)
    .map((key) => {
      const [address, tokenId] = key.split("||");
      return { address, tokenId };
    });
};

const [useBalancesFromDef] = bind((strBalanceDefs: string = "") => {
  const balanceDefs = deserializeBalanceDefs(strBalanceDefs);

  return getBalances$(balanceDefs).pipe(
    map((balances) => ({
      data: balances.map((bs) => ({
        address: bs.address,
        tokenId: bs.tokenId,
        balance: bs.balance,
        isLoading: bs.status !== "loaded",
      })),
      isLoading: balances.some((b) => b.status !== "loaded"),
    })),
  );
});

export const useBalances = ({
  balanceDefs,
}: UseBalancesProps): UseBalancesResult => {
  useEffect(() => {
    if (!balanceDefs?.length) return;

    const unsubscribe = subscribeBalances(balanceDefs);

    return () => {
      unsubscribe();
    };
  }, [balanceDefs]);

  // serialize hook args to prevent infinite re-render loop
  const strBalanceDefs = useMemo(
    () => serializeBalanceDefs(balanceDefs),
    [balanceDefs],
  );

  return useBalancesFromDef(strBalanceDefs);
};
