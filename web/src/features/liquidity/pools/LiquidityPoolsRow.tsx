import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { Styles } from "../../../components/styles";
import { TokenLogo } from "../../../components/TokenLogo";
import { getTokenDescription } from "../../../util/getTokenDescription";
import { cn } from "../../../utils/cn";
import { LiquidityPoolBalances } from "./LiquidityPoolBalance";
import type { LiquidityPoolsVisibleCol } from "./types";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

type LiquidityPoolsRowProps = {
	pool: LiquidityPoolRowData;
	visibleCol: LiquidityPoolsVisibleCol;
};

export const LiquidityPoolsRow: FC<LiquidityPoolsRowProps> = ({
	pool,
	visibleCol,
}) => {
	const description = useMemo(
		() => getTokenDescription(pool.token2),
		[pool.token2],
	);

	return (
		<Link
			to={pool.poolAssetId.toString()}
			className={cn(
				Styles.button,
				"grid  h-16 items-center gap-2 rounded-md bg-primary-950/50 px-2 pl-3 pr-3 text-left hover:bg-primary-900/50 sm:gap-4",
				"grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
			)}
		>
			<div className="flex items-center gap-2 overflow-hidden sm:gap-3 h-full pl-1">
				<div className="h-10 shrink-0">
					<TokenLogo className="inline-block size-10" token={pool.token1} />
					<TokenLogo
						className="-ml-3 inline-block size-10"
						token={pool.token2}
					/>
				</div>
				<div className="flex grow flex-col items-start overflow-hidden">
					<div className="w-full truncate">
						{pool.token1.symbol}/{pool.token2.symbol}
					</div>
					<div className="w-full truncate text-sm text-neutral-500">
						{description}
					</div>
				</div>
			</div>

			<div className={cn(visibleCol === "tvl" && "hidden sm:block")}>
				{!!pool.totalPositionsValuation && (
					<LiquidityPoolBalances display="positions" pool={pool} />
				)}
			</div>

			<div className={cn(visibleCol === "positions" && "hidden sm:block")}>
				{!!pool.valuation && (
					<LiquidityPoolBalances display="valuation" pool={pool} />
				)}
			</div>
		</Link>
	);
};
