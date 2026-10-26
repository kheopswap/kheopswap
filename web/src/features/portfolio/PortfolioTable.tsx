import { useCallback, useMemo, useState } from "react";
import { SearchInput } from "../../components/SearchInput";
import type { TokenId } from "../../registry/tokens/types";
import { isListedRow, matchesTokenSearch } from "./getWatchedTokens";
import { PortfolioHeaderRow } from "./PortfolioHeaderRow";
import { usePortfolio } from "./PortfolioProvider";
import { PortfolioRows } from "./PortfolioRows";
import { PortfolioTokenDrawer } from "./PortfolioTokenDrawer";
import { sortByColumn } from "./sortPortfolioRows";
import type { PortfolioSortMode, PortfolioVisibleCol } from "./types";
import { usePortfolioRows } from "./usePortfolioRows";

export const PortfolioTable = () => {
	const {
		accounts,
		balances,
		holdingsByTokenId,
		isLoading,
		isLoadingTokens,
		poolTokenIds,
		search,
		setSearch,
	} = usePortfolio();
	const allRows = usePortfolioRows();

	const [selectedTokenId, setSelectedTokenId] = useState<TokenId | null>(null);

	const [visibleCol, setVisibleCol] = useState<PortfolioVisibleCol>(
		accounts.length ? "balance" : "price",
	);
	const [sortByCol, setSortByCol] = useState<PortfolioSortMode>(visibleCol);

	const sortedRows = useMemo(
		() =>
			allRows
				.concat()
				.sort(sortByColumn("symbol"))
				.sort(sortByColumn("price"))
				.sort(sortByColumn(sortByCol)),
		[allRows, sortByCol],
	);

	const isSearching = !!search.trim();

	const rows = useMemo(
		() =>
			isSearching
				? sortedRows.filter(({ token }) => matchesTokenSearch(token, search))
				: sortedRows.filter((row) => isListedRow(row, poolTokenIds)),
		[isSearching, search, sortedRows, poolTokenIds],
	);

	const isLoadingRows = isSearching ? isLoadingTokens : isLoading;

	const handleSortClick = useCallback((column: PortfolioSortMode) => {
		if (column !== "symbol") setVisibleCol(column);
		setSortByCol(column);
	}, []);

	const handleDismiss = useCallback(() => setSelectedTokenId(null), []);

	return (
		<div>
			<SearchInput
				className="mx-4 mb-4 sm:mx-5"
				placeholder="Search for more tokens"
				onChange={setSearch}
			/>
			<PortfolioHeaderRow
				rows={rows}
				isLoading={isLoadingRows}
				sortByCol={sortByCol}
				withBalances={!!accounts.length}
				hasBalances={!!balances.length}
				onColumnHeaderClick={handleSortClick}
			/>
			<PortfolioRows
				rows={rows}
				visibleCol={visibleCol}
				holdingsByTokenId={holdingsByTokenId}
				isLoading={isLoadingRows}
				onTokenSelect={setSelectedTokenId}
			/>
			<PortfolioTokenDrawer
				tokenId={selectedTokenId}
				rows={rows}
				onDismiss={handleDismiss}
			/>
		</div>
	);
};
