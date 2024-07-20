import { useMemo } from "react";

import { useNativeToken } from "./useNativeToken";
import { usePoolReservesByTokenIds } from "./usePoolReservesByAssetIds";
import { useToken } from "./useToken";
import { useTokenChain } from "./useTokenChain";

import { TokenId } from "src/config/tokens";
import { isBigInt, plancksToTokens } from "src/util";
import { getAssetConvertPlancks } from "src/util/getAssetConvertPlancks";

type UseAssetConvertPlancks = {
  tokenIdIn: TokenId | null | undefined;
  tokenIdOut: TokenId | null | undefined;
  plancks: bigint | null | undefined;
};

export const useAssetConvertPlancks = ({
  tokenIdIn,
  tokenIdOut,
  plancks,
}: UseAssetConvertPlancks) => {
  const chain = useTokenChain({ tokenId: tokenIdIn });
  const nativeToken = useNativeToken({ chain });
  const { data: tokenIn } = useToken({ tokenId: tokenIdIn });
  const { data: tokenOut } = useToken({ tokenId: tokenIdOut });

  const qNativeToTokenIn = usePoolReservesByTokenIds({
    tokenId1: nativeToken?.id,
    tokenId2: tokenIn?.id,
  });
  const qNativeToTokenOut = usePoolReservesByTokenIds({
    tokenId1: nativeToken?.id,
    tokenId2: tokenOut?.id,
  });

  const plancksOut = useMemo(() => {
    if (!plancks || !tokenOut || !nativeToken || !tokenIn) return undefined;

    const reserveNativeToToken =
      nativeToken.id !== tokenIn.id ? qNativeToTokenIn.data : [1n, 1n];
    const reserveNativeToStable =
      nativeToken.id !== tokenOut.id ? qNativeToTokenOut.data : [1n, 1n];

    if (!reserveNativeToToken || !reserveNativeToStable) return undefined;

    if ([...reserveNativeToStable, ...reserveNativeToToken].includes(0n))
      return undefined;

    return getAssetConvertPlancks(
      plancks,
      tokenIn,
      nativeToken,
      tokenOut,
      reserveNativeToToken as [bigint, bigint],
      reserveNativeToStable as [bigint, bigint],
    );
  }, [
    nativeToken,
    plancks,
    qNativeToTokenOut.data,
    qNativeToTokenIn.data,
    tokenOut,
    tokenIn,
  ]);

  const isLoading =
    !isBigInt(plancksOut) &&
    (qNativeToTokenIn.isLoading || qNativeToTokenOut.isLoading);

  // 2 dependant queries, and sometimes they may be invalid or unused. can't provide useQuery result accurately
  return {
    isLoading,
    plancksOut,
    tokenIn,
    tokenOut,
  };
};

export const useAssetConvertPrice = ({
  tokenIdIn,
  tokenIdOut,
  plancks,
}: UseAssetConvertPlancks) => {
  const { plancksOut, isLoading, tokenIn, tokenOut } = useAssetConvertPlancks({
    tokenIdIn,
    tokenIdOut,
    plancks,
  });

  return {
    isLoading,
    price:
      isBigInt(plancksOut) && tokenOut
        ? plancksToTokens(plancksOut, tokenOut.decimals)
        : undefined,
    tokenIn,
    tokenOut,
  };
};
