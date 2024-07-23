import { FC, useCallback, useDeferredValue, useMemo, useState } from "react";
import { groupBy } from "lodash";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { PortfolioProvider, usePortfolio } from "./PortfolioProvider";

import { Token } from "src/config/tokens";
import { getChainById } from "src/config/chains";
import { cn, isBigInt, logger, sortBigInt } from "src/util";
import { SearchInput, Styles, TokenLogo, Tokens } from "src/components";
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
  (mode: SortMode) => (a: TokenRowData | null, b: TokenRowData | null) => {
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
  <div
    className={cn(
      "flex flex-col items-end overflow-hidden text-right",
      className,
    )}
  >
    <div
      className={cn(
        "w-full truncate",
        isLoadingTokenPlancks && "animate-pulse",
      )}
    >
      <Tokens token={token} plancks={tokenPlancks ?? 0n} digits={2} />
    </div>
    <div
      className={cn(
        "w-full truncate text-sm text-neutral-500 ",
        isLoadingStablePlancks && "animate-pulse",
      )}
    >
      <Tokens token={stableToken} plancks={stablePlancks ?? 0n} digits={2} />
    </div>
  </div>
);

type TokenRowData = {
  token: Token;
  stableToken: Token;
  balance: TokenBalancesSummaryData;
  tvl: TokenBalancesSummaryData | null;
};

type TokenRowProps = TokenRowData & {
  visibleCol: VisibleColunm;
};

const TokenRow: FC<TokenRowProps> = ({
  token,
  stableToken,
  balance,
  tvl,
  visibleCol,
}) => {
  const chain = useMemo(() => getChainById(token.chainId), [token]);

  return (
    <div
      className={cn(
        Styles.button,
        "grid h-16 items-center gap-2 rounded-md bg-primary-950/50 p-2 pl-4 pr-3 text-left sm:gap-4 ",
        "grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden sm:gap-3">
        <TokenLogo className="inline-block size-10" token={token} />
        <div className="flex grow flex-col items-start overflow-hidden">
          <div className="w-full truncate">{token.symbol}</div>
          <div className="w-full truncate text-sm text-neutral-500">{`${chain.name}${token.type === "asset" ? ` - ${token.assetId}` : ""}`}</div>
        </div>
      </div>

      {balance.tokenPlancks ? (
        <TokenBalancesSummary
          className={cn(visibleCol === "tvl" && "hidden sm:block")}
          token={token}
          stableToken={stableToken}
          {...balance}
        />
      ) : (
        <div className={cn(visibleCol === "tvl" && "hidden sm:block")}></div>
      )}

      {tvl?.tokenPlancks ? (
        <TokenBalancesSummary
          className={cn(visibleCol === "balance" && "hidden sm:block")}
          token={token}
          stableToken={stableToken}
          {...tvl}
        />
      ) : (
        <div
          className={cn(visibleCol === "balance" && "hidden sm:block")}
        ></div>
      )}
    </div>
  );
};

type SortMode = "tvl" | "balance" | "symbol";
type VisibleColunm = "tvl" | "balance";

const TokenRows: FC<{ rows: TokenRowData[] }> = ({ rows }) => {
  const { accounts } = usePortfolio();
  const [parent] = useAutoAnimate();

  const [visibleCol, setVisibleCol] = useState<VisibleColunm>(
    accounts.length ? "balance" : "tvl",
  );
  const [sortByCol, setSortByCol] = useState<SortMode>(visibleCol);

  const handleSortClick = useCallback(
    (column: SortMode) => () => {
      if (column !== "symbol") setVisibleCol(column);
      setSortByCol(column);
    },
    [],
  );

  const sortedRows = useMemo(
    () => rows.concat().sort(sortByColumn(sortByCol)),
    [rows, sortByCol],
  );

  const [rawSearch, setRawSearch] = useState("");
  const search = useDeferredValue(rawSearch);

  const searchedRows = useMemo(() => {
    const stop = logger.timer("search");
    const ls = search.toLowerCase().trim();
    const res = !ls
      ? sortedRows.filter(
          ({ token, balance, tvl }) =>
            !!token.verified || !!balance.tokenPlancks || !!tvl?.tokenPlancks,
        )
      : sortedRows.filter(
          ({ token }) =>
            token.symbol?.toLowerCase().includes(ls) ||
            token.name?.toLowerCase().includes(ls) ||
            (token.type === "asset" && token.assetId.toString() === ls),
        );
    stop();
    return res;
  }, [search, sortedRows]);

  return (
    <div>
      <SearchInput
        className="mb-4 "
        placeholder="Search for more tokens"
        onChange={setRawSearch}
      />
      <div
        className={cn(
          "mb-1 grid  gap-2 pl-4 pr-3 text-xs text-neutral-500  sm:gap-4",
          "grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
        )}
      >
        <div>
          {/* <button
            type="button"
            className={cn(sortBy === "symbol" && "text-neutral-200")}
            onClick={handleSortClick("symbol")}
          >
            Token
          </button> */}
        </div>
        <div className="hidden text-right sm:block">
          <button
            type="button"
            className={cn(sortByCol === "balance" && "text-neutral-200")}
            onClick={handleSortClick("balance")}
          >
            Balance
          </button>
        </div>
        <div className="whitespace-nowrap text-right">
          <button
            type="button"
            className={cn(
              "sm:hidden",
              sortByCol === "balance" && "text-neutral-200",
            )}
            onClick={handleSortClick("balance")}
          >
            Balance
          </button>
          <span className="mx-1 inline-block shrink-0 sm:hidden">/</span>
          <button
            type="button"
            className={cn(sortByCol === "tvl" && "text-neutral-200")}
            onClick={handleSortClick("tvl")}
          >
            TVL
          </button>
        </div>
      </div>
      <div ref={parent} className="flex flex-col gap-2">
        {searchedRows.map(({ token, balance, stableToken, tvl }) => (
          <TokenRow
            key={token.id}
            token={token}
            visibleCol={visibleCol}
            balance={balance}
            stableToken={stableToken}
            tvl={tvl}
          />
        ))}
      </div>
    </div>
  );
};

const TokensList = () => {
  const { balances, tokens, stableToken, tvl } = usePortfolio();

  // useEffect(() => {

  // }, [balances, stableToken, tokens, tvl]);

  const tokenAndBalances = useMemo<TokenRowData[]>(() => {
    //console.log("TokensList", { balances, tokens, stableToken, tvl });

    const balancesByTokenId = groupBy(balances, "tokenId");
    return tokens.map<TokenRowData>((token) => {
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
