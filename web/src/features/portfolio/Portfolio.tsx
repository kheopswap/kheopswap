import { FC, useCallback, useMemo, useState } from "react";
import { groupBy } from "lodash";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { PortfolioProvider, usePortfolio } from "./PortfolioProvider";

import { Token } from "src/config/tokens";
import { getChainById } from "src/config/chains";
import { cn, isBigInt, sortBigInt } from "src/util";
import { Styles, TokenLogo, Tokens } from "src/components";
import { useWallets } from "src/hooks";

type TokenBalancesSummaryData = {
  tokenPlancks: bigint | undefined;
  isLoadingTokenPlancks: boolean;
  stablePlancks: bigint | null;
  isLoadingStablePlancks: boolean;
};

const sortBySummary = (
  a: TokenBalancesSummaryData,
  b: TokenBalancesSummaryData,
) => {
  if (isBigInt(a.stablePlancks) && isBigInt(b.stablePlancks))
    return sortBigInt(a.stablePlancks, b.stablePlancks, true);
  if (isBigInt(a.stablePlancks)) return -1;
  if (isBigInt(b.stablePlancks)) return 1;

  if (a.tokenPlancks && !b.tokenPlancks) return -1;
  if (!a.tokenPlancks && b.tokenPlancks) return 1;
  return 0;
};

const sortByColumn =
  (mode: SortMode) => (a: TokenRowProps | null, b: TokenRowProps | null) => {
    if (mode === "symbol")
      return (a?.token.symbol ?? "").localeCompare(b?.token.symbol ?? "");
    if (mode === "tvl") {
      if (a?.tvl?.tokenPlancks && b?.tvl?.tokenPlancks)
        return sortBySummary(a.tvl, b.tvl);
      if (a?.tvl?.tokenPlancks) return -1;
      if (b?.tvl?.tokenPlancks) return 1;
    } else {
      if (a?.balance.tokenPlancks && b?.balance.tokenPlancks)
        return sortBySummary(a.balance, b.balance);
      if (a?.balance.tokenPlancks) return -1;
      if (b?.balance.tokenPlancks) return 1;
    }

    return 0;
  };

const TokenBalancesSummary: FC<
  TokenBalancesSummaryData & {
    className?: string;
    token: Token;
    stableToken: Token;
  }
> = ({
  token,
  stableToken,
  tokenPlancks,
  isLoadingStablePlancks,
  stablePlancks,
  isLoadingTokenPlancks,
  className,
}) => (
  <div className={cn("flex flex-col items-end", className)}>
    <div className={cn("", isLoadingTokenPlancks && "animate-pulse")}>
      <Tokens token={token} plancks={tokenPlancks ?? 0n} digits={2} />
    </div>
    <div
      className={cn(
        "truncate text-sm text-neutral-500",
        isLoadingStablePlancks && "animate-pulse",
      )}
    >
      <Tokens token={stableToken} plancks={stablePlancks ?? 0n} digits={2} />
    </div>
  </div>
);

// type BalancesByAddress = Record<
//   string,
//   {
//     balance: bigint | undefined;
//     isLoading: boolean;
//     stablePlancks: bigint | null;
//     isLoadingStablePlancks: boolean;
//   }
// >;

type TokenRowProps = {
  token: Token;
  stableToken: Token;
  balance: TokenBalancesSummaryData;
  tvl: TokenBalancesSummaryData | null;
  // balances: BalancesByAddress;
  // total: bigint;
  // totalStables: bigint | null;
  // isLoading: boolean;
  // isLoadingStables: boolean;
};

const TokenRow: FC<TokenRowProps> = ({ token, stableToken, balance, tvl }) => {
  const chain = useMemo(() => getChainById(token.chainId), [token]);
  // const showBalances = useMemo(
  //   () => !!Object.keys(balances).length,
  //   [balances],
  // );

  return (
    <div
      className={cn(
        Styles.button,
        "grid h-16 grid-cols-3 items-center gap-2 rounded-md bg-primary-950/50 p-2 pl-4 pr-3 text-left sm:gap-3",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <TokenLogo className="inline-block size-10" token={token} />
        <div className="flex grow flex-col items-start">
          <div className="truncate">{token.symbol}</div>
          <div className="truncate text-sm text-neutral-500">{`${chain.name}${token.type === "asset" ? ` - ${token.assetId}` : ""}`}</div>
        </div>
      </div>

      {balance.tokenPlancks ? (
        <TokenBalancesSummary
          token={token}
          stableToken={stableToken}
          {...balance}
        />
      ) : (
        <div></div>
      )}
      {tvl?.tokenPlancks ? (
        <TokenBalancesSummary
          token={token}
          stableToken={stableToken}
          {...tvl}
        />
      ) : (
        <div></div>
      )}
    </div>
  );
};

type SortMode = "tvl" | "balance" | "symbol";

const TokenRows: FC<{ rows: TokenRowProps[] }> = ({ rows }) => {
  const [parent] = useAutoAnimate();

  const [sortBy, setSortBy] = useState<SortMode>("balance");

  const handleSortClick = useCallback(
    (column: SortMode) => () => {
      setSortBy(column);
    },
    [],
  );

  const sortedRows = useMemo(
    () => rows.sort(sortByColumn(sortBy)),
    [rows, sortBy],
  );

  return (
    <div>
      <div className="mb-1 grid grid-cols-3 text-xs text-neutral-500">
        <div className="pl-16">
          <button
            type="button"
            className={cn(sortBy === "symbol" && "text-neutral-300")}
            onClick={handleSortClick("symbol")}
          >
            Token
          </button>
        </div>
        <div className="pr-2 text-right">
          <button
            type="button"
            className={cn(sortBy === "balance" && "text-neutral-300")}
            onClick={handleSortClick("balance")}
          >
            Balance
          </button>
        </div>
        <div className="pr-2 text-right">
          <button
            type="button"
            className={cn(sortBy === "tvl" && "text-neutral-300")}
            onClick={handleSortClick("tvl")}
          >
            Asset Hub TVL
          </button>
        </div>
      </div>
      <div ref={parent} className="flex flex-col gap-2">
        {sortedRows.map(({ token, ...props }) => (
          <TokenRow key={token.id} token={token} {...props} />
        ))}
      </div>
    </div>
  );
};

const TokensList = () => {
  const { balances, tokens, stableToken, tvl } = usePortfolio();

  // useEffect(() => {

  // }, [balances, stableToken, tokens, tvl]);

  const tokenAndBalances = useMemo<TokenRowProps[]>(() => {
    //console.log("TokensList", { balances, tokens, stableToken, tvl });

    const balancesByTokenId = groupBy(balances, "tokenId");
    return tokens.map<TokenRowProps>((token) => {
      const tokenBalances = balancesByTokenId[token.id] ?? [];
      const total = tokenBalances.reduce(
        (acc, { balance }) => acc + (balance ?? 0n),
        0n,
      );
      const hasStable = tokenBalances.some(
        (tb) => tb.stablePlancks !== null && tb.balance,
      );
      const totalStables = hasStable
        ? tokenBalances.reduce(
            (acc, { stablePlancks }) => acc + (stablePlancks ?? 0n),
            0n,
          )
        : null;
      const isLoading = tokenBalances.some(({ isLoading }) => isLoading);
      const isLoadingStables = tokenBalances.some(
        ({ isLoadingStablePlancks }) => isLoadingStablePlancks,
      );
      const balance: TokenBalancesSummaryData = {
        tokenPlancks: total,
        isLoadingTokenPlancks: isLoading,
        stablePlancks: totalStables,
        isLoadingStablePlancks: isLoadingStables,
      };

      const tokenTvl = tvl.find((t) => t.tokenId === token.id);
      const rowTvl: TokenBalancesSummaryData | null = tokenTvl
        ? {
            tokenPlancks: tokenTvl.plancks,
            isLoadingTokenPlancks: tokenTvl.isLoading,
            stablePlancks: tokenTvl.stablePlancks,
            isLoadingStablePlancks: tokenTvl.isLoadingStablePlancks,
          }
        : null;

      // const balances = tokenBalances.reduce(
      //   (acc, bal) => ({
      //     ...acc,
      //     [bal.address]: {
      //       balance: bal.balance,
      //       isLoading: bal.isLoading,
      //       stablePlancks: bal.stablePlancks,
      //       isLoadingStablePlancks: bal.isLoadingStablePlancks,
      //     },
      //   }),
      //   {} as BalancesByAddress,
      // );

      return {
        token,
        stableToken,
        balance,
        balances,
        tvl: rowTvl,
      };
    });
    //   .sort(sortByColumn("balance"));
  }, [balances, stableToken, tokens, tvl]);

  return <TokenRows rows={tokenAndBalances} />;
};

export const Portfolio = () => {
  const { isReady } = useWallets();

  if (!isReady) return null;

  return (
    <PortfolioProvider>
      <TokensList />
    </PortfolioProvider>
  );
};
