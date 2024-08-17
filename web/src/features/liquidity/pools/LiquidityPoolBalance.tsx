import { type FC, useMemo } from "react";
import { Tokens } from "src/components";
import { useBalance, useStablePrice } from "src/hooks";
import { cn, tokensToPlancks } from "src/util";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

export const LiquidityPoolBalances: FC<{
	pool: LiquidityPoolRowData;
	display: "positions" | "valuation";
}> = ({ pool, display }) => {
	const { data: reserve1, isLoading: isLoadingNative } = useBalance({
		address: pool.owner,
		tokenId: pool.token1.id,
	});
	const { data: reserve2, isLoading: isLoadingAsset } = useBalance({
		address: pool.owner,
		tokenId: pool.token2.id,
	});
	const isLoading = isLoadingNative || isLoadingAsset;

	const { stableToken, price: price1 } = useStablePrice({
		tokenId: pool.token1.id,
		plancks: reserve1,
	});
	const { price: price2 } = useStablePrice({
		tokenId: pool.token2.id,
		plancks: reserve2,
	});
	const valuationPlancks = useMemo(() => {
		if (!price1 || !price2 || !stableToken || !pool) return null;
		const total =
			tokensToPlancks(price1, stableToken.decimals) +
			tokensToPlancks(price2, stableToken.decimals);

		if (display === "positions")
			return pool.valuation === null
				? null
				: (total * pool.totalPositionsValuation) / pool.valuation;

		return total;
	}, [price1, price2, stableToken, pool, display]);

	const [displayReserve1, displayReserve2] = useMemo(() => {
		if (display === "valuation") return [reserve1, reserve2] as const;

		return [reserve1, reserve2].map((reserve) => {
			if (!reserve || !pool.valuation) return undefined;

			return (reserve * pool.totalPositionsValuation) / pool.valuation;
		}) as [bigint | undefined, bigint | undefined];
	}, [reserve1, reserve2, display, pool]);

	return (
		<div
			className={cn(
				"flex flex-col items-end text-white",
				isLoading && "animate-pulse",
			)}
		>
			{!!valuationPlancks && stableToken ? (
				<div>
					<Tokens plancks={valuationPlancks} token={stableToken} />
				</div>
			) : (
				<>
					<div>
						{!!displayReserve1 && !!displayReserve2 && (
							<>
								<Tokens plancks={displayReserve1} token={pool.token1} /> /{" "}
								<Tokens plancks={displayReserve2} token={pool.token2} />
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
};
