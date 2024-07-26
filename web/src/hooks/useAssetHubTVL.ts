import { useMemo } from "react";
import { groupBy, mapValues, toPairs } from "lodash";

import { useRelayChains } from "./useRelayChains";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useBalances } from "./useBalances";
import { useStablePlancksMulti } from "./useStablePlancks";

import { TokenId } from "src/config/tokens";

type UseAssetHubTVLResult = {
  isLoading: boolean;
  data: {
    tokenId: TokenId;
    plancks: bigint;
    isLoading: boolean;
    stablePlancks: bigint | null;
    isLoadingStablePlancks: boolean;
  }[];
};

export const useAssetHubTVL = (): UseAssetHubTVLResult => {
  const { assetHub } = useRelayChains();

  const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
    chainId: assetHub.id,
  });

  const allPoolsReservesBalanceDefs = useMemo(
    () =>
      pools?.flatMap((pool) =>
        pool.tokenIds.map((tokenId) => ({
          address: pool.owner,
          tokenId,
        })),
      ) ?? [],
    [pools],
  );

  const { data: lockedBalances, isLoading: isLoadingBalances } = useBalances({
    balanceDefs: allPoolsReservesBalanceDefs,
  });

  const lockedTokens = useMemo(
    () =>
      toPairs(
        mapValues(groupBy(lockedBalances, "tokenId"), (tokenBalances) =>
          tokenBalances.reduce(
            (acc, { balance, isLoading }) => {
              acc.balance += balance ?? 0n;
              acc.isLoading = acc.isLoading || isLoading;
              return acc;
            },
            { balance: 0n, isLoading: false },
          ),
        ),
      ).map(([tokenId, { balance, isLoading }]) => ({
        tokenId,
        plancks: balance,
        isLoading,
      })),
    [lockedBalances],
  );

  const { data: assetConvertPlancks, isLoading: isLoadingAssetConvertPlancks } =
    useStablePlancksMulti({
      inputs: lockedTokens,
    });

  return useMemo(
    () => ({
      isLoading:
        isLoadingBalances || isLoadingPools || isLoadingAssetConvertPlancks,
      data: lockedTokens.map((token, i) => ({
        ...token,
        ...assetConvertPlancks[i],
      })),
    }),
    [
      assetConvertPlancks,
      isLoadingAssetConvertPlancks,
      isLoadingBalances,
      isLoadingPools,
      lockedTokens,
    ],
  );
};
