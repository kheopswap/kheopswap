import { type FC, memo, useCallback } from "react";
import { Shimmer } from "../../components/Shimmer";
import { VirtualizedList } from "../../components/VirtualizedList";
import type { TokenId } from "../../registry/tokens/types";
import { cn } from "../../utils/cn";
import { PortfolioRow } from "./PortfolioRow";
import type { PortfolioRowData, PortfolioVisibleCol } from "./types";

const ROW_HEIGHT = 72; // 64px row (h-16) + 8px gap (gap-2)

const getItemKey = (row: PortfolioRowData) => row.token.id;

export const PortfolioRows: FC<{
	rows: PortfolioRowData[];
	visibleCol: PortfolioVisibleCol;
	isLoading: boolean;
	onTokenSelect: (tokenId: TokenId) => void;
}> = memo(function PortfolioRows({
	rows,
	visibleCol,
	isLoading,
	onTokenSelect,
}) {
	const renderItem = useCallback(
		(row: PortfolioRowData) => (
			<PortfolioRow
				token={row.token}
				visibleCol={visibleCol}
				balance={row.balance}
				tvl={row.tvl}
				price={row.price}
				onSelect={onTokenSelect}
			/>
		),
		[visibleCol, onTokenSelect],
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
							<Shimmer className="size-10 rounded-full" />
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
			}
		/>
	);
});
