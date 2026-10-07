import { type FC, useCallback } from "react";
import { Pulse } from "../../../components/Pulse";
import { Shimmer } from "../../../components/Shimmer";
import { VirtualizedList } from "../../../components/VirtualizedList";
import { cn } from "../../../utils/cn";
import { LiquidityPoolsRow } from "./LiquidityPoolsRow";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

const ROW_HEIGHT = 68; // h-17

const getItemKey = (pool: LiquidityPoolRowData) => pool.poolAssetId;

export const LiquidityPoolsRows: FC<{
	rows: LiquidityPoolRowData[];
	isLoading: boolean;
}> = ({ rows, isLoading }) => {
	const renderItem = useCallback(
		(pool: LiquidityPoolRowData, index: number) => (
			<LiquidityPoolsRow pool={pool} isFirst={index === 0} />
		),
		[],
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
						"flex h-17 w-full items-center gap-3 px-1",
						!!rows.length && "border-t border-line",
						isLoading || !rows.length ? "visible" : "invisible",
					)}
				>
					{isLoading ? (
						<>
							<Pulse pulse className="flex h-8 shrink-0">
								<Shimmer className="inline-block size-8 rounded-full animate-none" />
								<Shimmer className="inline-block -ml-2.5 size-8 rounded-full animate-none" />
							</Pulse>
							<div className="flex grow flex-col items-start gap-1 overflow-hidden text-xs">
								<Shimmer className="">TK1/TK2</Shimmer>
								<Shimmer className="">Asset Hub - 420</Shimmer>
							</div>
						</>
					) : (
						<div className="text-muted">
							No liquidity pools match your search
						</div>
					)}
				</div>
			}
		/>
	);
};
