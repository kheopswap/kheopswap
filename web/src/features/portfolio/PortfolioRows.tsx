import { type FC, useCallback } from "react";

import { PortfolioRow } from "./PortfolioRow";
import type { PortfolioRowData, PortfolioVisibleCol } from "./types";

import type { TokenId } from "@kheopswap/registry";
import { cn } from "@kheopswap/utils";
import { Shimmer } from "src/components";

export const PortfolioRows: FC<{
	rows: PortfolioRowData[];
	visibleCol: PortfolioVisibleCol;
	isLoading: boolean;
	onTokenSelect: (tokenId: TokenId) => void;
}> = ({ rows, visibleCol, isLoading, onTokenSelect }) => {
	const handleRowClick = useCallback(
		(tokenId: TokenId) => () => {
			onTokenSelect(tokenId);
		},
		[onTokenSelect],
	);

	return (
		<div className="flex flex-col gap-2">
			{rows.map(({ token, balance, tvl, price }) => (
				<PortfolioRow
					key={token.id}
					token={token}
					visibleCol={visibleCol}
					balance={balance}
					tvl={tvl}
					price={price}
					onClick={handleRowClick(token.id)}
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
		</div>
	);
};
