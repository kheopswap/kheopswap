import { plancksToTokens } from "../../utils/plancks";

type CurvePoint = { x: number; y: number };

type CurveTrade = CurvePoint & { amountIn: number; priceImpact: number };

type CurvePool = {
	reserveIn: bigint;
	reserveOut: bigint;
	decimalsIn: number;
	decimalsOut: number;
	amountIn?: bigint | null;
};

type CurveSize = { width: number; height: number; padding: number };

export type CurveGeometry = {
	path: string;
	now: CurvePoint & { reserveIn: number; reserveOut: number };
	ladder: CurveTrade[];
	trade: CurveTrade | null;
};

const X_MIN_RATIO = 0.3;
const X_MAX_RATIO = 3.4;
const PATH_SAMPLES = 120;
const LADDER_RATIOS = [0.1, 0.5, 1, 2];
const MIN_VISIBLE_TRADE_RATIO = 0.001;

const getPriceImpact = (reserveIn: number, amountIn: number) =>
	amountIn / (reserveIn + amountIn);

export const getCurveGeometry = (
	{ reserveIn, reserveOut, decimalsIn, decimalsOut, amountIn }: CurvePool,
	{ width, height, padding }: CurveSize,
): CurveGeometry => {
	const x0 = Number(plancksToTokens(reserveIn, decimalsIn));
	const y0 = Number(plancksToTokens(reserveOut, decimalsOut));
	const k = x0 * y0;
	const xMin = x0 * X_MIN_RATIO;
	const xMax = x0 * X_MAX_RATIO;
	const yMax = k / xMin;

	const toPoint = (x: number): CurvePoint => ({
		x: padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding),
		y: height - padding - (k / x / yMax) * (height - 2 * padding),
	});

	const toTrade = (tradeAmountIn: number): CurveTrade => ({
		...toPoint(x0 + tradeAmountIn),
		amountIn: tradeAmountIn,
		priceImpact: getPriceImpact(x0, tradeAmountIn),
	});

	const path = Array.from({ length: PATH_SAMPLES + 1 }, (_, i) => {
		const { x, y } = toPoint(xMin * (xMax / xMin) ** (i / PATH_SAMPLES));
		return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
	}).join("");

	const tradeAmountIn = amountIn
		? Number(plancksToTokens(amountIn, decimalsIn))
		: 0;

	return {
		path,
		now: { ...toPoint(x0), reserveIn: x0, reserveOut: y0 },
		ladder: LADDER_RATIOS.map((ratio) => toTrade(x0 * ratio)),
		trade:
			tradeAmountIn > x0 * MIN_VISIBLE_TRADE_RATIO
				? toTrade(tradeAmountIn)
				: null,
	};
};
