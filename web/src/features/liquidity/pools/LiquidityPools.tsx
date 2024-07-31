import { useAutoAnimate } from "@formkit/auto-animate/react";
import { FC, useMemo } from "react";
import { Link } from "react-router-dom";

import { Tokens, TokenLogo, Styles } from "src/components";
import { ColumnHeaderButton } from "src/components/ColumnHeaderButton";
import {
  TokenAsset,
  TokenForeignAsset,
  TokenNative,
} from "src/config/tokens/types";
import {
  useChainName,
  useNativeToken,
  usePoolsByChainId,
  useRelayChains,
  useStablePrice,
  useBalance,
  useToken,
  useTokensByChainId,
} from "src/hooks";
import {
  PoolWithValuation,
  usePoolsWithValuation,
} from "src/hooks/usePoolsWithValuation";
import { cn, isBigInt, tokensToPlancks } from "src/util";

type PoolRowProps = {
  pool: PoolWithValuation;
  token1: TokenNative;
  token2: TokenAsset | TokenForeignAsset;
};
const PoolBalances: FC<PoolRowProps> = ({ token1, token2, pool }) => {
  const { data: reserve1, isLoading: isLoadingNative } = useBalance({
    address: pool.owner,
    tokenId: token1.id,
  });
  const { data: reserve2, isLoading: isLoadingAsset } = useBalance({
    address: pool.owner,
    tokenId: token2.id,
  });
  const isLoading = isLoadingNative || isLoadingAsset;

  const { stableToken, price: price1 } = useStablePrice({
    tokenId: token1.id,
    plancks: reserve1,
  });
  const { price: price2 } = useStablePrice({
    tokenId: token2.id,
    plancks: reserve2,
  });
  const valuationPlancks = useMemo(() => {
    if (!price1 || !price2 || !stableToken) return null;
    return (
      tokensToPlancks(price1, stableToken.decimals) +
      tokensToPlancks(price2, stableToken.decimals)
    );
  }, [price1, price2, stableToken]);

  return (
    <div
      className={cn(
        "flex flex-col items-end text-white",
        isLoading && "animate-pulse",
      )}
    >
      {!!valuationPlancks && stableToken ? (
        <div>
          <Tokens plancks={valuationPlancks} token={stableToken} />
        </div>
      ) : (
        <>
          <div>
            {!!reserve1 && !!reserve2 && (
              <>
                <Tokens plancks={reserve1} token={token1} /> /{" "}
                <Tokens plancks={reserve2} token={token2} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const PoolRow: FC<PoolRowProps> = ({ pool, token1, token2 }) => {
  const { name: chainName } = useChainName({ chainId: token2.chainId });

  return (
    <Link
      to={pool.poolAssetId.toString()} // TODO change to pool id
      className={cn(
        Styles.button,
        "flex min-h-16 w-full flex-wrap items-center gap-1 rounded-md bg-primary-950/50 p-2 pl-4 pr-3 hover:bg-primary-900/50",
      )}
    >
      <div className="flex grow items-center gap-3 py-1">
        <div className="h-10 shrink-0">
          <TokenLogo className="inline-block size-10" token={token1} />
          <TokenLogo className="-ml-3 inline-block size-10" token={token2} />
        </div>
        <div className="flex grow flex-col items-start text-neutral-400">
          <div className="flex grow items-center gap-2 overflow-hidden ">
            <div className="text-neutral-50">
              {token1.symbol}/{token2.symbol}
            </div>
          </div>
          <div className="truncate text-xs">
            {chainName}
            {token2.type === "asset" ? ` - ${token2.assetId}` : null}
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between sm:w-auto">
        <div className="sm:hidden">Liquidity</div>
        <PoolBalances token1={token1} token2={token2} pool={pool} />
      </div>
    </Link>
  );
};

const PoolShimmerRow: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn("min-h-16 w-full rounded-md bg-primary-900/50", className)}
  >
    <div
      className={cn(
        "flex animate-pulse items-center gap-3  overflow-hidden p-2 pl-4 pr-3",
      )}
    >
      <div className="h-10 shrink-0">
        <div className="inline-block size-10 rounded-full bg-neutral-800" />
        <div className="-ml-3 inline-block size-10 rounded-full bg-neutral-800" />
      </div>

      <div className="flex h-12 grow flex-col items-start justify-center">
        <div className="flex grow items-center gap-2 overflow-hidden ">
          <div className="select-none rounded-md bg-neutral-800 text-neutral-800">
            SYM Token
          </div>
        </div>
        <div className="select-none truncate rounded-md bg-neutral-800 text-xs font-light text-neutral-800">
          chain name & asset id
        </div>
      </div>
    </div>
  </div>
);

const PoolsList: FC<{
  pools: PoolRowProps[];
  isLoading: boolean;
}> = ({ pools, isLoading }) => {
  const [parent] = useAutoAnimate();

  return (
    <div>
      <div
        className={cn(
          "mb-1 gap-2 pl-4 pr-3 text-xs sm:gap-4",
          !pools.length && !isLoading && "invisible",
          "hidden sm:block",
        )}
      >
        <div></div>
        <div className="whitespace-nowrap text-right">
          <ColumnHeaderButton selected={true}>TVL</ColumnHeaderButton>
        </div>
      </div>
      <div ref={parent} className="relative flex flex-col gap-2">
        {pools.map(({ pool, token1, token2 }) => (
          <PoolRow
            key={`${pool.chainId}-${pool.poolAssetId}`}
            pool={pool}
            token1={token1}
            token2={token2}
          />
        ))}
        <PoolShimmerRow className={isLoading ? "block" : "hidden"} />
      </div>
    </div>
  );
};

export const LiquidityPools = () => {
  const { assetHub } = useRelayChains();
  const nativeToken = useNativeToken({ chain: assetHub });
  const { data: stableToken } = useToken({ tokenId: assetHub.stableTokenId });

  const { data: allTokens = [], isLoading: isLoadingTokens } =
    useTokensByChainId({
      chainId: assetHub.id,
    });

  const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
    chainId: assetHub.id,
  });

  const isLoading = isLoadingTokens || isLoadingPools;

  const { data: poolsWithValuation } = usePoolsWithValuation({
    pools,
    tokens: allTokens,
    nativeToken,
    stableToken,
  });

  const sortedPools = useMemo(() => {
    if (!poolsWithValuation) return [];

    return poolsWithValuation.sort((a, b) => {
      // sort based on valuation
      if (isBigInt(a.valuation) || isBigInt(b.valuation)) {
        if ((a.valuation ?? 0n) > (b.valuation ?? 0n)) return -1;
        if ((a.valuation ?? 0n) < (b.valuation ?? 0n)) return 1;
      }

      // or alphabetically by token symbol
      const assetA = allTokens.find((t) => t.id === a.tokenIds[1]);
      const assetB = allTokens.find((t) => t.id === b.tokenIds[1]);

      return assetA?.symbol.localeCompare(assetB?.symbol ?? "") ?? 0;
    });
  }, [poolsWithValuation, allTokens]);

  const poolsRows = useMemo<PoolRowProps[]>(() => {
    return sortedPools
      .map((pool) => ({
        pool,
        token1: allTokens.find((t) => t.id === pool.tokenIds[0]),
        token2: allTokens.find((t) => t.id === pool.tokenIds[1]),
      }))
      .filter((rp): rp is PoolRowProps => !!rp.token1 && !!rp.token2);
  }, [allTokens, sortedPools]);

  if (!nativeToken) return null;

  return <PoolsList pools={poolsRows} isLoading={isLoading} />;
};
