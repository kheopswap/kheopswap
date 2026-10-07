import { type FC, memo, useCallback } from "react";
import { Shimmer } from "../../components/Shimmer";
import { VirtualizedList } from "../../components/VirtualizedList";
import type { TokenId } from "../../registry/tokens/types";
import { cn } from "../../utils/cn";
import { PortfolioRow } from "./PortfolioRow";
import type { PortfolioRowData, PortfolioVisibleCol } from "./types";

const ROW_HEIGHT = 68; // h-17

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
		(row: PortfolioRowData, index: number) => (
			<PortfolioRow
				token={row.token}
				visibleCol={visibleCol}
				isFirst={index === 0}
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
						"flex h-17 w-full items-center gap-3 px-1",
						!!rows.length && "border-t border-line",
						isLoading || !rows.length ? "visible" : "invisible",
					)}
				>
					{isLoading ? (
						<>
							<Shimmer className="size-8 rounded-full" />
							<div className="flex grow flex-col items-start gap-1 overflow-hidden text-xs">
								<Shimmer className="">TOKEN</Shimmer>
								<Shimmer className="">Polkadot Network</Shimmer>
							</div>
						</>
					) : (
						<div className="text-muted">No tokens match your search</div>
					)}
				</div>
			}
		/>
	);
});
