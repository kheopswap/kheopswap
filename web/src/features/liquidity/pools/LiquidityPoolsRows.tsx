import { type FC, useCallback } from "react";
import { Pulse } from "../../../components/Pulse";
import { Shimmer } from "../../../components/Shimmer";
import { VirtualizedList } from "../../../components/VirtualizedList";
import { cn } from "../../../utils/cn";
import { LiquidityPoolsRow } from "./LiquidityPoolsRow";
import type { LiquidityPoolsVisibleCol } from "./types";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

const ROW_HEIGHT = 72; // 64px row (h-16) + 8px gap (gap-2)

const getItemKey = (pool: LiquidityPoolRowData) => pool.poolAssetId;

export const LiquidityPoolsRows: FC<{
	rows: LiquidityPoolRowData[];
	visibleCol: LiquidityPoolsVisibleCol;
	isLoading: boolean;
}> = ({ rows, visibleCol, isLoading }) => {
	const renderItem = useCallback(
		(pool: LiquidityPoolRowData) => (
			<LiquidityPoolsRow pool={pool} visibleCol={visibleCol} />
		),
		[visibleCol],
	);

	return (
		<VirtualizedList
			items={rows}
			estimateSize={ROW_HEIGHT}
			getItemKey={getItemKey}
			renderItem={renderItem}
			footer={
				<div
					className={cn(
						"flex h-16 w-full items-center gap-2 rounded-md border  border-neutral-800 bg-primary-950/50 px-4",
						isLoading || !rows.length ? "visible" : "invisible",
					)}
				>
					{isLoading ? (
						<>
							<Pulse pulse className="h-10 shrink-0">
								<Shimmer className="inline-block size-10 rounded-full animate-none" />
								<Shimmer className="inline-block -ml-3 size-10 rounded-full animate-none" />
							</Pulse>
							<div className="flex grow flex-col items-start gap-1 overflow-hidden text-xs">
								<Shimmer className="">TK1/TK2</Shimmer>
								<Shimmer className="">Asset Hub - 420</Shimmer>
							</div>
						</>
					) : (
						<div className="text-base font-light text-neutral-400">
							No liquidity pools match your search
						</div>
					)}
				</div>
			}
		/>
	);
};
