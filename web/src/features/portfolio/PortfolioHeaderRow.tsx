import { type FC, useCallback } from "react";

import type { PortfolioRowData, PortfolioSortMode } from "./types";

import { cn } from "@kheopswap/utils";
import { ColumnHeaderButton } from "src/components/ColumnHeaderButton";

export const PortfolioHeaderRow: FC<{
	rows: PortfolioRowData[];
	isLoading: boolean;
	sortByCol: PortfolioSortMode;
	withBalances: boolean;
	hasBalances: boolean;
	onColumnHeaderClick: (column: PortfolioSortMode) => void;
}> = ({
	rows,
	isLoading,
	sortByCol,
	withBalances,
	hasBalances,
	onColumnHeaderClick,
}) => {
	const handleSortClick = useCallback(
		(column: PortfolioSortMode) => () => {
			onColumnHeaderClick(column);
		},
		[onColumnHeaderClick],
	);

	return (
		<div
			className={cn(
				"mb-1 grid  gap-2 pl-4 pr-3 text-xs  sm:gap-4",
				"grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
				!rows.length && !isLoading && "invisible",
			)}
		>
			<div />
			<div className={"hidden text-right sm:block"}>
				<ColumnHeaderButton
					selected={sortByCol === "balance"}
					onClick={handleSortClick("balance")}
					className={cn(!hasBalances && "hidden")}
				>
					Balance
				</ColumnHeaderButton>
			</div>
			<div className="whitespace-nowrap text-right">
				{!!withBalances && (
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
					selected={sortByCol === "price"}
					onClick={handleSortClick("price")}
				>
					Price
				</ColumnHeaderButton>
			</div>
		</div>
	);
};
