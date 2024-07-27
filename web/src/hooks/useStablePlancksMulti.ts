import { useMemo } from "react";
import { keyBy } from "lodash";

import { useBalances } from "./useBalances";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useTokensByChainIds } from "./useTokensByChainIds";
import { useToken } from "./useToken";
import { useRelayChains } from "./useRelayChains";
import { useNativeToken } from "./useNativeToken";

import { getAssetConvertPlancks, getPoolReserves, isBigInt } from "src/util";
import {
  getChainIdFromTokenId,
  isTokenIdNative,
  TokenId,
} from "src/config/tokens";
import { ChainId, isChainIdAssetHub } from "src/config/chains";

type UseStablePlancksProps = {
  inputs: { tokenId: TokenId; plancks: bigint | undefined }[];
};

type UseStablePlancksResult = {
  isLoading: boolean;
  data: { stablePlancks: bigint | null; isLoadingStablePlancks: boolean }[];
};

export const useStablePlancksMulti = ({
  inputs,
}: UseStablePlancksProps): UseStablePlancksResult => {
  // TODO : make these depend on inputs
  const { assetHub, relayId } = useRelayChains();
  const nativeToken = useNativeToken({ chain: assetHub });
  const { data: stableToken } = useToken({
    tokenId: assetHub.stableTokenId,
  });

  const chainIds = useMemo(
    () => [
      ...new Set(
        inputs
          .map(({ tokenId }) => getChainIdFromTokenId(tokenId)) // TODO why allow null ?
          .filter(Boolean) as ChainId[],
      ),
    ],
    [inputs],
  );
  const { data: allTokens, isLoading: isLoadingTokens } = useTokensByChainIds({
    chainIds,
  });
  const allTokensMap = useMemo(() => keyBy(allTokens, "id"), [allTokens]);

  const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
    chainId: assetHub.id,
  });
  const poolsBalanceDefs = useMemo(() => {
    // TODO filter out useless pools
    return (
      pools?.flatMap((pool) =>
        pool.tokenIds.map((tokenId) => ({
          address: pool.owner,
          tokenId,
        })),
      ) ?? []
    );
  }, [pools]);

  const { data: poolsReserves, isLoading } = useBalances({
    balanceDefs: poolsBalanceDefs,
  });

  const reservesNativeToStable = useMemo(
    () => getPoolReserves(pools, poolsReserves, nativeToken, stableToken),
    [nativeToken, pools, poolsReserves, stableToken],
  );

  const data = useMemo(() => {
    return inputs.map(({ tokenId, plancks }) => {
      let token = allTokensMap[tokenId];
      if (!token)
        return {
          stablePlancks: null,
          isLoadingStablePlancks: isLoadingTokens,
        };

      //if relay native token, replace token by the native token of asset hub
      if (
        isTokenIdNative(tokenId) &&
        relayId === getChainIdFromTokenId(tokenId) &&
        nativeToken
      )
        token = nativeToken;

      if (!isChainIdAssetHub(token.chainId))
        return {
          stablePlancks: null,
          isLoadingStablePlancks: false,
        };

      const reservesNativeToToken =
        tokenId === nativeToken?.id
          ? ([1n, 1n] as [bigint, bigint])
          : getPoolReserves(pools, poolsReserves, nativeToken, token);

      const result =
        !token ||
        !isBigInt(plancks) ||
        !nativeToken ||
        !stableToken ||
        !reservesNativeToStable ||
        !reservesNativeToToken
          ? null
          : (getAssetConvertPlancks(
              plancks,
              token,
              nativeToken,
              stableToken,
              reservesNativeToToken,
              reservesNativeToStable,
            ) ?? null);

      return {
        stablePlancks: result,
        isLoadingStablePlancks: isLoadingPools,
      };
    });
  }, [
    allTokensMap,
    inputs,
    isLoadingPools,
    isLoadingTokens,
    nativeToken,
    pools,
    poolsReserves,
    relayId,
    reservesNativeToStable,
    stableToken,
  ]);

  return { isLoading, data };
};
