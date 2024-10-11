import { type FC, useCallback } from "react";

import type { LiquidityPoolsSortMode } from "./types";

import { cn } from "@kheopswap/utils";
import { ColumnHeaderButton } from "src/components/ColumnHeaderButton";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

export const LiquidityPoolsHeaderRow: FC<{
	rows: LiquidityPoolRowData[];
	isLoading: boolean;
	sortByCol: LiquidityPoolsSortMode;
	withPositions: boolean;
	onColumnHeaderClick: (column: LiquidityPoolsSortMode) => void;
}> = ({ rows, isLoading, sortByCol, withPositions, onColumnHeaderClick }) => {
	const handleSortClick = useCallback(
		(column: LiquidityPoolsSortMode) => () => {
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
					selected={sortByCol === "positions"}
					onClick={handleSortClick("positions")}
					className={cn(!withPositions && "hidden")}
				>
					Positions
				</ColumnHeaderButton>
			</div>
			<div className="whitespace-nowrap text-right">
				{!!withPositions && (
					<>
						<ColumnHeaderButton
							selected={sortByCol === "positions"}
							className="sm:hidden"
							onClick={handleSortClick("positions")}
						>
							Positions
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
	);
};
