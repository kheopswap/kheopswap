import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { TokenLogo } from "../../../components/TokenLogo";
import { cn } from "../../../utils/cn";
import { getTokenDescription } from "../../../utils/getTokenDescription";
import { LiquidityPoolBalances } from "./LiquidityPoolBalance";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

type LiquidityPoolsRowProps = {
	pool: LiquidityPoolRowData;
	isFirst: boolean;
};

export const LiquidityPoolsRow: FC<LiquidityPoolsRowProps> = ({
	pool,
	isFirst,
}) => {
	const description = useMemo(
		() => getTokenDescription(pool.token2),
		[pool.token2],
	);

	return (
		<Link
			to={pool.poolAssetId.toString()}
			className={cn(
				"grid h-17 grid-cols-[1fr_auto] content-center items-center gap-x-4 px-1 text-left hover:bg-row-hover sm:grid-cols-[1fr_180px_180px]",
				!isFirst && "border-t border-line",
			)}
		>
			<div className="row-span-2 flex items-center gap-3 overflow-hidden sm:row-span-1">
				<div className="flex shrink-0">
					<TokenLogo className="inline-block size-8" token={pool.token1} />
					<TokenLogo
						className="-ml-2.5 inline-block size-8"
						token={pool.token2}
					/>
				</div>
				<div className="flex grow flex-col items-start overflow-hidden">
					<div className="w-full truncate font-semibold">
						{pool.token1.symbol}/{pool.token2.symbol}
					</div>
					<div className="w-full truncate text-xs text-muted">
						{description}
					</div>
				</div>
			</div>

			<div className="col-start-2 row-start-2 text-xs text-accent sm:row-start-1 sm:text-sm">
				{!!pool.totalPositionsValuation && (
					<LiquidityPoolBalances display="positions" pool={pool} />
				)}
			</div>

			<div className="col-start-2 row-start-1 font-semibold sm:col-start-3">
				{!!pool.valuation && (
					<LiquidityPoolBalances display="valuation" pool={pool} />
				)}
			</div>
		</Link>
	);
};
