import { keyBy } from "lodash";
import { useMemo } from "react";

import { ChainId, isChainIdAssetHub } from "src/config/chains";
import {
  getChainIdFromTokenId,
  isTokenIdNative,
  TokenId,
} from "src/config/tokens";
import {
  useBalances,
  useNativeToken,
  usePoolsByChainId,
  useRelayChains,
  useToken,
  useWallets,
} from "src/hooks";
import { useTokensByChainIds } from "src/hooks/useTokens";
import {
  getAssetConvertPlancks,
  getPoolReserves,
  isBigInt,
  provideContext,
} from "src/util";

type UseStablePlancksProps = {
  inputs: { tokenId: TokenId; plancks: bigint | undefined }[];
  outputTokenId: TokenId;
};

type UseStablePlancksResult = {
  isLoading: boolean;
  data: { stablePlancks: bigint | null; isLoadingStablePlancks: boolean }[];
};

const useStablePlancks = ({
  inputs,
  // outputTokenId, // TODO use this instead of stable
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

  // const assetHub = useMemo(() => assetHubId ? getChainById(assetHubId) : null, [assetHubId]);
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

  const res = useMemo(() => {
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

  return { isLoading, data: res };
};

export const usePortfolioProvider = () => {
  const { accounts } = useWallets();

  const { allChains, assetHub } = useRelayChains();
  const chainIds = useMemo(
    () => allChains.map((chain) => chain.id),
    [allChains],
  );

  const { data: allTokens, isLoading: isLoadingTokens } = useTokensByChainIds({
    chainIds,
  });
  const tokens = useMemo(
    () => allTokens.filter((t) => t.type !== "pool-asset"),
    [allTokens],
  );

  const balanceDefs = useMemo(() => {
    // TODO genesishHash filter
    // TODO account/chain compatibility filter
    return tokens.flatMap((token) =>
      accounts.map((acc) => ({
        address: acc.address,
        tokenId: token.id,
      })),
    );
  }, [accounts, tokens]);

  const { data: balances, isLoading: isLoadingBalances } = useBalances({
    balanceDefs,
  });

  const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });
  const { data: stables, isLoading: isLoadingStables } = useStablePlancks({
    inputs: balances.map(({ tokenId, balance }) => ({
      tokenId,
      plancks: balance,
    })),
    outputTokenId: "TODO",
  });

  const ctx = useMemo(
    () => ({
      isLoading: isLoadingTokens || isLoadingBalances,
      balances: balances.map((b, idx) => ({
        ...b,
        ...(stables[idx] ?? {
          stablePlancks: null,
          isLoading: isLoadingStables,
        }),
      })),
      accounts,
      tokens,
      stableToken: stableToken!,
    }),
    [
      accounts,
      balances,
      isLoadingBalances,
      isLoadingStables,
      isLoadingTokens,
      stableToken,
      stables,
      tokens,
    ],
  );

  return ctx;
};

export const [PortfolioProvider, usePortfolio] =
  provideContext(usePortfolioProvider);
