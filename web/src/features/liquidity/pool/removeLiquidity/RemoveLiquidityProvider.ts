import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import { getApi, isApiAssetHub } from "src/services/api";
import {
  getXcmV3MultilocationFromTokenId,
  provideContext,
  safeQueryKeyPart,
} from "src/util";

const useRemoveLiquidityProvider = () => {
  const { assetHub, nativeToken, assetToken, position, lpSlippage, account } =
    useLiquidityPoolPage();

  const [ratio, setRatio] = useState(1);

  const lpTokenBurn = useMemo(() => {
    if (!position) return 0n;
    return (position.shares * BigInt(Math.round(ratio * 100))) / 100n;
  }, [position, ratio]);

  const [nativeReceived, assetReceived, nativeReceivedMin, assetReceivedMin] =
    useMemo(() => {
      const received = (position?.reserves.map(
        (r) => (r * BigInt(Math.round(ratio * 100))) / 100n,
      ) as [bigint, bigint]) ?? [0n, 0n];
      const receivedMin = received.map(
        (r) => (r * (1000n - BigInt(Math.round(lpSlippage * 1000)))) / 1000n,
      );
      return [...received, ...receivedMin] as [bigint, bigint, bigint, bigint];
    }, [lpSlippage, position?.reserves, ratio]);

  const { data: call } = useQuery({
    queryKey: [
      "remove_liquidity_call",
      nativeToken?.id,
      assetToken?.id,
      account?.address,
      safeQueryKeyPart(lpTokenBurn),
      safeQueryKeyPart(nativeReceivedMin),
      safeQueryKeyPart(assetReceivedMin),
    ],
    queryFn: async () => {
      if (!nativeToken || !assetToken || !account || !lpTokenBurn) return null;

      const asset1 = getXcmV3MultilocationFromTokenId(nativeToken.id);
      const asset2 = getXcmV3MultilocationFromTokenId(assetToken.id);

      if (!asset1 || !asset2) return null;

      const api = await getApi(assetHub.id);
      if (!isApiAssetHub(api)) return null;

      return api.tx.AssetConversion.remove_liquidity({
        asset1,
        asset2,
        lp_token_burn: lpTokenBurn,
        amount1_min_receive: nativeReceivedMin,
        amount2_min_receive: assetReceivedMin,
        withdraw_to: account.address,
      });
    },
  });

  const onReset = useCallback(() => {
    setRatio(1);
  }, []);

  return {
    ratio,
    setRatio,
    nativeReceived,
    assetReceived,
    nativeReceivedMin,
    assetReceivedMin,
    call,
    onReset,
  };
};

export const [RemoveLiquidityProvider, useRemoveLiquidity] = provideContext(
  useRemoveLiquidityProvider,
);
