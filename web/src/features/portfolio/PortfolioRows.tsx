import { useAutoAnimate } from "@formkit/auto-animate/react";
import { type FC, useCallback } from "react";

import { PortfolioRow } from "./PortfolioRow";
import type { PortfolioRowData, PortfolioVisibleColunm } from "./types";

import { Shimmer } from "src/components";
import type { TokenId } from "src/config/tokens";
import { cn } from "src/util";

export const PortfolioRows: FC<{
	rows: PortfolioRowData[];
	visibleCol: PortfolioVisibleColunm;
	isLoading: boolean;
	onTokenSelect: (tokenId: TokenId) => void;
}> = ({ rows, visibleCol, isLoading, onTokenSelect }) => {
	const [parent] = useAutoAnimate();

	const handleRowClick = useCallback(
		(tokenId: TokenId) => () => {
			onTokenSelect(tokenId);
		},
		[onTokenSelect],
	);

	return (
		<div ref={parent} className="flex flex-col gap-2">
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
						<Shimmer className="size-10 rounded-full"></Shimmer>
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
