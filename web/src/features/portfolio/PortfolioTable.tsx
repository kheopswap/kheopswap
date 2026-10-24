import { useCallback, useMemo, useState } from "react";
import { SearchInput } from "../../components/SearchInput";
import type { TokenId } from "../../registry/tokens/types";
import type { BalanceWithStable } from "../../types/balances";
import { isBigInt } from "../../utils/isBigInt";
import { sortBigInt } from "../../utils/sortBigInt";
import { matchesTokenSearch } from "./getWatchedTokens";
import { PortfolioHeaderRow } from "./PortfolioHeaderRow";
import { usePortfolio } from "./PortfolioProvider";
import { PortfolioRows } from "./PortfolioRows";
import { PortfolioTokenDrawer } from "./PortfolioTokenDrawer";
import type {
	PortfolioRowData,
	PortfolioSortMode,
	PortfolioVisibleCol,
} from "./types";
import { usePortfolioRows } from "./usePortfolioRows";

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
		if (mode === "price") {
			if (a?.price?.tokenPlancks && b?.price?.tokenPlancks)
				return sortByValue(a.price, b.price);
			if (a?.price?.tokenPlancks) return -1;
			if (b?.price?.tokenPlancks) return 1;
		} else {
			if (a?.balance?.tokenPlancks && b?.balance?.tokenPlancks)
				return sortByValue(a.balance, b.balance);
			if (a?.balance?.tokenPlancks) return -1;
			if (b?.balance?.tokenPlancks) return 1;
		}

		return 0;
	};

export const PortfolioTable = () => {
	const {
		accounts,
		balances,
		holdingsByTokenId,
		isLoading,
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

	const rows = useMemo(
		() =>
			search.trim()
				? sortedRows.filter(({ token }) => matchesTokenSearch(token, search))
				: sortedRows.filter(
						({ token, balance, tvl }) =>
							!!token.verified ||
							!!balance?.tokenPlancks ||
							!!tvl?.tokenPlancks,
					),
		[search, sortedRows],
	);

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
				isLoading={isLoading}
				sortByCol={sortByCol}
				withBalances={!!accounts.length}
				hasBalances={!!balances.length}
				onColumnHeaderClick={handleSortClick}
			/>
			<PortfolioRows
				rows={rows}
				visibleCol={visibleCol}
				holdingsByTokenId={holdingsByTokenId}
				isLoading={isLoading}
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
