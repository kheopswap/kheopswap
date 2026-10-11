import { type FC, useId, useMemo } from "react";
import type { Token } from "../../registry/tokens/types";
import { formatDecimals } from "../../utils/formatDecimals";
import { type CurveGeometry, getCurveGeometry } from "./getCurveGeometry";
import { useSwap } from "./SwapProvider";

const SIZE = { width: 560, height: 520, padding: 36 };

const formatAmount = (tokens: number) => formatDecimals(tokens, 4);

const formatPriceImpact = (priceImpact: number) => {
	const percent = priceImpact * 100;
	return `−${percent.toFixed(percent < 10 ? 1 : 0)}%`;
};

const CurveCaption: FC<{
	amountIn: string;
	symbolIn: string;
	trade: CurveGeometry["trade"];
}> = ({ amountIn, symbolIn, trade }) => {
	const yourAmount = (
		<b className="font-semibold text-text">
			{amountIn} {symbolIn}
		</b>
	);

	if (!Number(amountIn))
		return (
			<>
				Every swap slides the pool along this curve. The points show the price
				impact of trades of each size, before fees.
			</>
		);

	if (!trade)
		return (
			<>
				Your {yourAmount} barely moves along this curve. The points show the
				price impact of larger trades, before fees.
			</>
		);

	return (
		<>
			Your {yourAmount} has a {formatPriceImpact(trade.priceImpact)} price
			impact on this curve. The points show other trade sizes, before fees.
		</>
	);
};

const SwapCurveChart: FC<{
	tokenIn: Token;
	tokenOut: Token;
	reserveIn: bigint;
	reserveOut: bigint;
	amountIn: string;
	totalIn: bigint | null;
}> = ({ tokenIn, tokenOut, reserveIn, reserveOut, amountIn, totalIn }) => {
	const glowId = useId();
	const { width, height, padding } = SIZE;

	const { path, now, ladder, trade } = useMemo(
		() =>
			getCurveGeometry(
				{
					reserveIn,
					reserveOut,
					decimalsIn: tokenIn.decimals,
					decimalsOut: tokenOut.decimals,
					amountIn: totalIn,
				},
				SIZE,
			),
		[reserveIn, reserveOut, tokenIn.decimals, tokenOut.decimals, totalIn],
	);

	const isTradeOnChart = !!trade && trade.x <= width - padding;

	return (
		<section className="pt-2">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="w-full overflow-visible font-mono"
				role="img"
				aria-label={`${tokenIn.symbol}/${tokenOut.symbol} pool curve`}
			>
				<defs>
					<radialGradient id={glowId}>
						<stop
							offset="0"
							stopColor="var(--color-primary)"
							stopOpacity={0.55}
						/>
						<stop offset="1" stopColor="var(--color-primary)" stopOpacity={0} />
					</radialGradient>
				</defs>
				<line
					x1={padding}
					y1={height - padding}
					x2={width - padding}
					y2={height - padding}
					className="stroke-axis"
				/>
				<line
					x1={padding}
					y1={padding}
					x2={padding}
					y2={height - padding}
					className="stroke-axis"
				/>
				<text
					x={width - padding}
					y={height - padding + 22}
					textAnchor="end"
					className="fill-faint text-[11px] font-medium"
				>
					{tokenIn.symbol} in pool
				</text>
				<text
					x={padding}
					y={padding - 14}
					className="fill-faint text-[11px] font-medium"
				>
					{tokenOut.symbol} in pool
				</text>
				<path
					d={path}
					className="fill-none stroke-text stroke-[1.25] [stroke-opacity:0.55]"
				/>
				{ladder.map((step) => (
					<g key={step.amountIn}>
						<circle
							cx={step.x}
							cy={step.y}
							r={3.5}
							className="fill-page stroke-muted stroke-[1.25]"
						/>
						<text
							x={step.x + 12}
							y={step.y - 10}
							className="fill-muted text-[11.5px] font-medium"
						>
							{formatAmount(step.amountIn)} {tokenIn.symbol}
							<tspan dx={8} className="fill-text">
								{formatPriceImpact(step.priceImpact)}
							</tspan>
						</text>
					</g>
				))}
				{isTradeOnChart && (
					<g>
						<circle cx={trade.x} cy={trade.y} r={4.5} className="fill-text" />
						<text
							x={trade.x + 12}
							y={trade.y + 18}
							className="fill-text text-[11.5px] font-medium"
						>
							{amountIn} {tokenIn.symbol}
							<tspan dx={8}>{formatPriceImpact(trade.priceImpact)}</tspan>
						</text>
					</g>
				)}
				<circle cx={now.x} cy={now.y} r={38} fill={`url(#${glowId})`} />
				<circle cx={now.x} cy={now.y} r={5} className="fill-primary" />
				<text
					x={now.x - 14}
					y={now.y + 4}
					textAnchor="end"
					className="fill-text text-xs font-medium"
				>
					{formatAmount(now.reserveIn)} {tokenIn.symbol}
				</text>
				<text
					x={now.x - 14}
					y={now.y + 22}
					textAnchor="end"
					className="fill-text text-xs font-medium"
				>
					{formatAmount(now.reserveOut)} {tokenOut.symbol}
				</text>
			</svg>
			<p className="mt-4.5 ml-9 max-w-[46ch] text-[13px] text-muted">
				<CurveCaption
					amountIn={amountIn}
					symbolIn={tokenIn.symbol}
					trade={trade}
				/>
			</p>
		</section>
	);
};

export const SwapCurve = () => {
	const {
		tokenIn,
		tokenOut,
		reserveIn,
		reserveOut,
		isLoadingReserves,
		isPoolNotFound,
		formData,
		totalIn,
	} = useSwap();

	if (
		isPoolNotFound ||
		isLoadingReserves ||
		!tokenIn ||
		!tokenOut ||
		!reserveIn ||
		!reserveOut
	)
		return null;

	return (
		<SwapCurveChart
			tokenIn={tokenIn}
			tokenOut={tokenOut}
			reserveIn={reserveIn}
			reserveOut={reserveOut}
			amountIn={formData.amountIn}
			totalIn={totalIn}
		/>
	);
};
