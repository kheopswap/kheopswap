import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { PortfolioProvider, usePortfolio } from "./PortfolioProvider";
import {
  TokenBalancesSummaryData,
  PortfolioVisibleColunm,
  PortfolioRowData,
} from "./types";
import { PortfolioRow } from "./PortfolioRow";
import { usePortfolioRows } from "./usePortfolioRows";

import { cn, isBigInt, sortBigInt } from "src/util";
import { SearchInput, Shimmer } from "src/components";
import { useWallets } from "src/hooks";
import { ColumnHeaderButton } from "src/components/ColumnHeaderButton";

const sortByValue = (
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
  (mode: SortMode) =>
  (a: PortfolioRowData | null, b: PortfolioRowData | null) => {
    if (mode === "symbol")
      return (a?.token.symbol ?? "").localeCompare(b?.token.symbol ?? "");
    if (mode === "tvl") {
      if (a?.tvl?.tokenPlancks && b?.tvl?.tokenPlancks)
        return sortByValue(a.tvl, b.tvl);
      if (a?.tvl?.tokenPlancks) return -1;
      if (b?.tvl?.tokenPlancks) return 1;
    } else {
      if (a?.balance.tokenPlancks && b?.balance.tokenPlancks)
        return sortByValue(a.balance, b.balance);
      if (a?.balance.tokenPlancks) return -1;
      if (b?.balance.tokenPlancks) return 1;
    }

    return 0;
  };

type SortMode = "tvl" | "balance" | "symbol";

const PortfolioRows = ({
  rows,
  visibleCol,
  isLoading,
}: {
  rows: PortfolioRowData[];
  visibleCol: PortfolioVisibleColunm;
  isLoading: boolean;
}) => {
  const [parent] = useAutoAnimate();

  return (
    <div ref={parent} className="flex flex-col gap-2">
      {rows.map(({ token, balance, stableToken, tvl }) => (
        <PortfolioRow
          key={token.id}
          token={token}
          visibleCol={visibleCol}
          balance={balance}
          stableToken={stableToken}
          tvl={tvl}
        />
      ))}
      <div
        className={cn(
          "flex h-16 w-full items-center gap-2 rounded-md border  border-neutral-800 bg-primary-950/50 px-4",
          isLoading || !rows.length ? "visible" : "invisible",
        )}
      >
        {isLoading ? (
          <>
            <Shimmer className="size-10 rounded-full"></Shimmer>
            <div className="flex grow flex-col items-start gap-1 overflow-hidden text-xs">
              <Shimmer className="">TOKEN</Shimmer>
              <Shimmer className="">Polkadot Network</Shimmer>
            </div>
          </>
        ) : (
          <div className="text-base font-light text-neutral-400">
            No tokens match your search
          </div>
        )}
      </div>
    </div>
  );
};

const PortfolioTable = () => {
  const rows = usePortfolioRows();

  const { accounts, balances, isLoading } = usePortfolio();

  const [visibleCol, setVisibleCol] = useState<PortfolioVisibleColunm>(
    accounts.length ? "balance" : "tvl",
  );
  const [sortByCol, setSortByCol] = useState<SortMode>(visibleCol);

  const sortedRows = useMemo(
    () => rows.concat().sort(sortByColumn(sortByCol)),
    [rows, sortByCol],
  );

  const [rawSearch, setRawSearch] = useState("");
  const search = useDeferredValue(rawSearch);

  const searchedRows = useMemo(() => {
    const ls = search.toLowerCase().trim();
    return !ls
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
  }, [search, sortedRows]);

  const handleSortClick = useCallback(
    (column: SortMode) => () => {
      if (column !== "symbol") setVisibleCol(column);
      setSortByCol(column);
    },
    [],
  );

  return (
    <div>
      <SearchInput
        className="mb-4 "
        placeholder="Search for more tokens"
        onChange={setRawSearch}
      />
      <div
        className={cn(
          "mb-1 grid  gap-2 pl-4 pr-3 text-xs  sm:gap-4",
          "grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
          !searchedRows.length && !isLoading && "invisible",
        )}
      >
        <div></div>
        <div className={"hidden text-right sm:block"}>
          <ColumnHeaderButton
            selected={sortByCol === "balance"}
            onClick={handleSortClick("balance")}
            className={cn(!balances.length && "hidden")}
          >
            Balance
          </ColumnHeaderButton>
        </div>
        <div className="whitespace-nowrap text-right">
          {!!accounts.length && (
            <>
              <ColumnHeaderButton
                selected={sortByCol === "balance"}
                className="sm:hidden"
                onClick={handleSortClick("balance")}
              >
                Balance
              </ColumnHeaderButton>
              <span className="mx-1 inline-block shrink-0 sm:hidden">/</span>
            </>
          )}
          <ColumnHeaderButton
            selected={sortByCol === "tvl"}
            onClick={handleSortClick("tvl")}
          >
            TVL
          </ColumnHeaderButton>
        </div>
      </div>
      <PortfolioRows
        rows={searchedRows}
        visibleCol={visibleCol}
        isLoading={isLoading}
      />
    </div>
  );
};

export const Portfolio = () => {
  const { isReady } = useWallets();

  // prevent flickering on page load by waiting for wallet auto-connect to be performed
  if (!isReady) return null;

  return (
    <PortfolioProvider>
      <PortfolioTable />
    </PortfolioProvider>
  );
};
