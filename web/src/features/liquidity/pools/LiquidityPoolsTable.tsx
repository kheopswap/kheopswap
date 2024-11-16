import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { SearchInput } from "src/components";
import { useWallets } from "src/hooks";
import { LiquidityPoolsHeaderRow } from "./LiquidityPoolsHeaderRow";
import { LiquidityPoolsRows } from "./LiquidityPoolsRows";
import type { LiquidityPoolsSortMode, LiquidityPoolsVisibleCol } from "./types";
import {
	type LiquidityPoolRowData,
	useLiquidityPoolsTable,
} from "./useLiquidityPools";

const sortByColumn =
	(mode: LiquidityPoolsSortMode) =>
	(a: LiquidityPoolRowData | null, b: LiquidityPoolRowData | null) => {
		if (mode === "symbol") {
			const s1 = `${a?.token1.symbol ?? ""}/${a?.token2.symbol ?? ""}`;
			const s2 = `${b?.token1.symbol ?? ""}/${b?.token2.symbol ?? ""}`;
			return s1.localeCompare(s2);
		}

		if (mode === "tvl") {
			if (a?.valuation && b?.valuation)
				return a.valuation > b.valuation ? -1 : 1;
			if (a?.valuation) return -1;
			if (b?.valuation) return 1;
		} else if (mode === "positions") {
			if (a?.totalPositionsValuation && b?.totalPositionsValuation)
				return a.totalPositionsValuation > b.totalPositionsValuation ? -1 : 1;
			if (a?.totalPositionsValuation) return -1;
			if (b?.totalPositionsValuation) return 1;
		}

		return 0;
	};

export const LiquidityPoolsTable = () => {
	const { data: pools, isLoading } = useLiquidityPoolsTable();

	const { accounts } = useWallets();

	const [visibleCol, setVisibleCol] = useState<LiquidityPoolsVisibleCol>("tvl");
	const [sortByCol, setSortByCol] =
		useState<LiquidityPoolsSortMode>(visibleCol);

	const sortedRows = useMemo(
		() =>
			pools
				.concat()
				.sort(sortByColumn("symbol"))
				.sort(sortByColumn("tvl"))
				.sort(sortByColumn(sortByCol)),
		[pools, sortByCol],
	);

	const [rawSearch, setRawSearch] = useState("");
	const search = useDeferredValue(rawSearch);

	const rows = useMemo(() => {
		const ls = search.toLowerCase().trim();
		return !ls
			? sortedRows
			: sortedRows.filter(
					({ token2 }) =>
						token2.symbol?.toLowerCase().includes(ls) ||
						token2.name?.toLowerCase().includes(ls) ||
						(token2.type === "asset" && token2.assetId.toString() === ls),
				);
	}, [search, sortedRows]);

	const handleSortClick = useCallback((column: LiquidityPoolsSortMode) => {
		if (column !== "symbol") setVisibleCol(column);
		setSortByCol(column);
	}, []);

	return (
		<div>
			<SearchInput
				className="mb-4 "
				placeholder="Search"
				onChange={setRawSearch}
			/>
			<LiquidityPoolsHeaderRow
				rows={rows}
				isLoading={isLoading}
				sortByCol={sortByCol}
				withPositions={!!accounts.length}
				onColumnHeaderClick={handleSortClick}
			/>
			<LiquidityPoolsRows
				rows={rows}
				visibleCol={visibleCol}
				isLoading={isLoading}
			/>
		</div>
	);
};
