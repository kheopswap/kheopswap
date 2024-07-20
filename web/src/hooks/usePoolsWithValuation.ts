import { useMemo } from "react";

import { BalanceState, useBalances } from "./useBalances";

import { Token } from "src/config/tokens";
import { Pool } from "src/services/pools";
import { isBigInt } from "src/util";
import { getAssetConvertPlancks } from "src/util/getAssetConvertPlancks";

export type PoolWithValuation = Pool & {
  valuation: bigint | null;
};

type UsePoolsWithValuationProps = {
  pools: Pool[] | null | undefined;
  tokens: Token[] | null | undefined;
  nativeToken: Token | null | undefined;
  stableToken: Token | null | undefined;
};

const getReserves = (
  pools: Pool[] | null | undefined,
  allReservesBalances: BalanceState[] | null | undefined,
  token1: Token | null | undefined,
  token2: Token | null | undefined,
) => {
  if (!pools || !allReservesBalances || !token1 || !token2) return null;

  if (token1.id === token2.id) return [1n, 1n] as [bigint, bigint];

  const poolNativeToStable = pools?.find(
    (pool) =>
      pool.tokenIds.includes(token1.id) &&
      pool.tokenIds.includes(token2.id) &&
      pool.tokenIds.length === 2,
  );
  const reserveNative = allReservesBalances?.find(
    (balance) =>
      balance.address === poolNativeToStable?.owner &&
      balance.tokenId === token1.id,
  );
  const reserveStable = allReservesBalances?.find(
    (balance) =>
      balance.address === poolNativeToStable?.owner &&
      balance.tokenId === token2.id,
  );
  return reserveNative?.balance && reserveStable?.balance
    ? ([reserveNative.balance, reserveStable.balance] as [bigint, bigint])
    : null;
};

export const usePoolsWithValuation = ({
  pools,
  tokens,
  nativeToken,
  stableToken,
}: UsePoolsWithValuationProps) => {
  const allReserves = useMemo(
    () =>
      pools?.flatMap((pool) =>
        pool.tokenIds.map((tokenId) => ({
          address: pool.owner,
          tokenId,
        })),
      ) ?? [],
    [pools],
  );

  const { data: allReservesBalances, isLoading } = useBalances({
    balanceDefs: allReserves,
  });

  const reservesNativeToStable = useMemo(
    () => getReserves(pools, allReservesBalances, nativeToken, stableToken),
    [allReservesBalances, nativeToken, pools, stableToken],
  );

  const poolsWithStablePrices = useMemo(() => {
    if (!reservesNativeToStable) return [];

    return pools?.map<PoolWithValuation>((pool) => {
      const poolBalances = allReservesBalances?.filter(
        (balance) => balance.address === pool.owner,
      );

      const stablePrices = poolBalances?.map(({ balance, tokenId }) => {
        const token = tokens?.find((t) => t.id === tokenId);
        const reservesNativeToToken =
          tokenId === nativeToken?.id
            ? ([1n, 1n] as [bigint, bigint])
            : getReserves(pools, allReservesBalances, nativeToken, token);

        if (
          !token ||
          !isBigInt(balance) ||
          !nativeToken ||
          !stableToken ||
          !reservesNativeToStable ||
          !reservesNativeToToken
        )
          return null;

        return getAssetConvertPlancks(
          balance,
          token,
          nativeToken,
          stableToken,
          reservesNativeToToken,
          reservesNativeToStable,
        );
      });

      const valuation =
        stablePrices?.length && stablePrices.every(isBigInt)
          ? stablePrices.reduce((acc, val) => acc + val, 0n)
          : null;

      return { ...pool, valuation };
    });
  }, [
    allReservesBalances,
    nativeToken,
    pools,
    reservesNativeToStable,
    stableToken,
    tokens,
  ]);

  return { data: poolsWithStablePrices, isLoading };
};
