import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { FC } from "react";

import { LiquidityPoolsRow } from "./LiquidityPoolsRow";

import { Shimmer } from "src/components";
import { cn } from "src/util";
import type { LiquidityPoolsVisibleCol } from "./types";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

export const LiquidityPoolsRows: FC<{
	rows: LiquidityPoolRowData[];
	visibleCol: LiquidityPoolsVisibleCol;
	isLoading: boolean;
}> = ({ rows, visibleCol, isLoading }) => {
	const [parent] = useAutoAnimate();

	return (
		<div ref={parent} className="flex flex-col gap-2">
			{rows.map((pool) => (
				<LiquidityPoolsRow
					key={pool.poolAssetId}
					pool={pool}
					visibleCol={visibleCol}
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
						<div className="h-10 shrink-0 animate-pulse">
							<Shimmer className="inline-block size-10 rounded-full animate-none" />
							<Shimmer className="inline-block -ml-3 size-10 rounded-full animate-none" />
						</div>
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
		</div>
	);
};
