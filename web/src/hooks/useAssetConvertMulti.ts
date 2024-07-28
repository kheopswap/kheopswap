import { useMemo } from "react";
import { keyBy } from "lodash";

import { useRelayChains } from "./useRelayChains";
import { useNativeToken } from "./useNativeToken";
import { useTokens } from "./useTokens";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useBalances } from "./useBalances";

import { TokenId } from "src/config/tokens";
import { getAssetConvertPlancks, getPoolReserves } from "src/util";

type AssetConvertInput = {
  tokenIdIn: TokenId;
  plancksIn: bigint;
  tokenIdOut: TokenId;
};

type UseAssetConvertMultiProps = {
  inputs: AssetConvertInput[];
};

type AssetConvertResult = AssetConvertInput & {
  plancksOut: bigint | null;
  isLoading: boolean;
};

type AssetConvertMultiResult = {
  data: AssetConvertResult[];
  isLoading: boolean;
};

export const useAssetConvertMulti = ({
  inputs,
}: UseAssetConvertMultiProps): AssetConvertMultiResult => {
  const { assetHub } = useRelayChains();
  const nativeToken = useNativeToken({ chain: assetHub });

  const tokenIds = useMemo(
    () => [
      ...new Set(
        inputs
          .map(({ tokenIdIn }) => tokenIdIn)
          .concat(inputs.map(({ tokenIdOut }) => tokenIdOut)),
      ),
    ],
    [inputs],
  );

  const { data: tokens, isLoading: isLoadingTokens } = useTokens({ tokenIds });

  const tokensMap = useMemo(() => keyBy(tokens, "id"), [tokens]);

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

  const { data: reserves, isLoading: isLoadingReserves } = useBalances({
    balanceDefs: poolsBalanceDefs,
  });

  return useMemo(() => {
    const data = inputs.map<AssetConvertResult>((input) => {
      const { tokenIdIn, plancksIn, tokenIdOut } = input;
      const tokenIn = tokensMap[tokenIdIn];
      const tokenOut = tokensMap[tokenIdOut];

      if (!tokenIn || !tokenOut || !nativeToken)
        return { ...input, plancksOut: null, isLoading: isLoadingTokens };

      const reserveNativeToTokenIn = getPoolReserves(
        pools,
        reserves,
        nativeToken,
        tokenIn,
      );
      const reserveNativeToTokenOut = getPoolReserves(
        pools,
        reserves,
        nativeToken,
        tokenOut,
      );

      if (!reserveNativeToTokenIn || !reserveNativeToTokenOut)
        return {
          ...input,
          plancksOut: null,
          isLoading: isLoadingPools || isLoadingReserves,
        };

      const plancksOut =
        getAssetConvertPlancks(
          plancksIn,
          tokenIn,
          nativeToken,
          tokenOut,
          reserveNativeToTokenIn,
          reserveNativeToTokenOut,
        ) ?? null;

      return {
        ...input,
        plancksOut,
        isLoading: isLoadingPools || isLoadingReserves,
      };
    });

    return { data, isLoading: data.some(({ isLoading }) => isLoading) };
  }, [
    inputs,
    isLoadingPools,
    isLoadingReserves,
    isLoadingTokens,
    nativeToken,
    pools,
    reserves,
    tokensMap,
  ]);
};
