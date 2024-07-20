import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useAccountBalancesForPool } from "./useAccountBalancesForPool";
import { usePoolPosition } from "./usePoolPosition";

import { getTokenId } from "src/config/tokens";
import {
  useNativeToken,
  usePoolByTokenIds,
  usePoolReserves,
  useRelayChains,
  useSetting,
  useToken,
  useWalletAccount,
} from "src/hooks";
import { provideContext } from "src/util";

// provides informations that are common between add & remove liquidity pages
const useLiquidityPoolPageProvider = () => {
  const { assetId } = useParams();
  const { assetHub } = useRelayChains();
  const [defaultAccountId, setDefaultAccountId] =
    useSetting("defaultAccountId");
  const [lpSlippage, setLpSlippage] = useSetting("lpSlippage");

  const account = useWalletAccount({ id: defaultAccountId });
  const address = useMemo(() => account?.address ?? null, [account]);

  const assetTokenId = useMemo(
    () =>
      assetId
        ? getTokenId({
            type: "asset",
            chainId: assetHub.id,
            assetId: Number(assetId),
          })
        : null,
    [assetId, assetHub.id],
  );

  const nativeToken = useNativeToken({ chain: assetHub });

  const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });

  const { data: assetToken, isLoading: isLoadingToken } = useToken({
    tokenId: assetTokenId,
  });

  const { data: pool, isLoading: isLoadingPool } = usePoolByTokenIds({
    chainId: assetHub.id,
    tokenIds:
      nativeToken && assetTokenId ? [nativeToken.id, assetTokenId] : null,
  });

  const { data: reserves, isLoading: isLoadingReserves } = usePoolReserves({
    pool,
  });

  const { data: position, isLoading: isLoadingPosition } = usePoolPosition({
    pool,
    address,
    reserves,
    isLoadingReserves,
  });

  const { data: accountBalances, isLoading: isLoadingAccountBalances } =
    useAccountBalancesForPool({ pool, address });

  return {
    assetHub,
    pool,
    nativeToken,
    assetToken,
    stableToken,
    isLoadingToken,
    isLoadingPool,
    isLoadingReserves,
    isLoadingPosition,
    account,
    reserves,
    position,
    accountBalances,
    isLoadingAccountBalances,
    defaultAccountId,
    setDefaultAccountId,
    lpSlippage,
    setLpSlippage,
  };
};

export const [LiquidityPoolPageProvider, useLiquidityPoolPage] = provideContext(
  useLiquidityPoolPageProvider,
);
