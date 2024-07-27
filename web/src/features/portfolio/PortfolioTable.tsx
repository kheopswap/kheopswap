import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { PortfolioRows } from "./PortfolioRows";
import { usePortfolioRows } from "./usePortfolioRows";
import { usePortfolio } from "./PortfolioProvider";
import {
  PortfolioRowData,
  PortfolioVisibleColunm,
  PortfolioSortMode,
} from "./types";
import { PortfolioHeaderRow } from "./PortfolioHeaderRow";
import { PortfolioTokenDrawer } from "./PortfolioTokenDrawer";

import { SearchInput } from "src/components";
import { isBigInt, sortBigInt } from "src/util";
import { TokenId } from "src/config/tokens";
import { BalanceWithStable } from "src/types";

const sortByValue = (a: BalanceWithStable, b: BalanceWithStable) => {
  if (isBigInt(a.stablePlancks) && isBigInt(b.stablePlancks))
    return sortBigInt(a.stablePlancks, b.stablePlancks, true);
  if (isBigInt(a.stablePlancks)) return -1;
  if (isBigInt(b.stablePlancks)) return 1;

  if (isBigInt(a.tokenPlancks) && isBigInt(b.tokenPlancks))
    return sortBigInt(a.tokenPlancks, b.tokenPlancks, true);
  if (a.tokenPlancks && !b.tokenPlancks) return -1;
  if (!a.tokenPlancks && b.tokenPlancks) return 1;
  return 0;
};

const sortByColumn =
  (mode: PortfolioSortMode) =>
  (a: PortfolioRowData | null, b: PortfolioRowData | null) => {
    if (mode === "symbol")
      return (a?.token.symbol ?? "").localeCompare(b?.token.symbol ?? "");
    if (mode === "tvl") {
      if (a?.tvl?.tokenPlancks && b?.tvl?.tokenPlancks)
        return sortByValue(a.tvl, b.tvl);
      if (a?.tvl?.tokenPlancks) return -1;
      if (b?.tvl?.tokenPlancks) return 1;
    } else {
      if (a?.balance?.tokenPlancks && b?.balance?.tokenPlancks)
        return sortByValue(a.balance, b.balance);
      if (a?.balance?.tokenPlancks) return -1;
      if (b?.balance?.tokenPlancks) return 1;
    }

    return 0;
  };

export const PortfolioTable = () => {
  const { accounts, balances, isLoading } = usePortfolio();
  const allRows = usePortfolioRows();

  const [selectedTokenId, setSelectedTokenId] = useState<TokenId | null>(null);

  const [visibleCol, setVisibleCol] = useState<PortfolioVisibleColunm>(
    accounts.length ? "balance" : "tvl",
  );
  const [sortByCol, setSortByCol] = useState<PortfolioSortMode>(visibleCol);

  const sortedRows = useMemo(
    () => allRows.concat().sort(sortByColumn(sortByCol)),
    [allRows, sortByCol],
  );

  const [rawSearch, setRawSearch] = useState("");
  const search = useDeferredValue(rawSearch);

  const rows = useMemo(() => {
    const ls = search.toLowerCase().trim();
    return !ls
      ? sortedRows.filter(
          ({ token, balance, tvl }) =>
            !!token.verified || !!balance?.tokenPlancks || !!tvl?.tokenPlancks,
        )
      : sortedRows.filter(
          ({ token }) =>
            token.symbol?.toLowerCase().includes(ls) ||
            token.name?.toLowerCase().includes(ls) ||
            (token.type === "asset" && token.assetId.toString() === ls),
        );
  }, [search, sortedRows]);

  const handleSortClick = useCallback((column: PortfolioSortMode) => {
    if (column !== "symbol") setVisibleCol(column);
    setSortByCol(column);
  }, []);

  return (
    <div>
      <SearchInput
        className="mb-4 "
        placeholder="Search for more tokens"
        onChange={setRawSearch}
      />
      <PortfolioHeaderRow
        rows={rows}
        isLoading={isLoading}
        sortByCol={sortByCol}
        withBalances={!!accounts.length}
        hasBalances={!!balances.length}
        onColumnHeaderClick={handleSortClick}
      />
      <PortfolioRows
        rows={rows}
        visibleCol={visibleCol}
        isLoading={isLoading}
        onTokenSelect={setSelectedTokenId}
      />
      <PortfolioTokenDrawer
        tokenId={selectedTokenId}
        onDismiss={() => setSelectedTokenId(null)}
      />
    </div>
  );
};
