import { describe, expect, it } from "vitest";
import { getCurveGeometry } from "./getCurveGeometry";

const size = { width: 560, height: 520, padding: 36 };

const X0 = 914_200;
const Y0 = 1_149_000;
const DECIMALS_IN = 10;
const DECIMALS_OUT = 6;

const pool = {
	reserveIn: BigInt(X0) * 10n ** BigInt(DECIMALS_IN),
	reserveOut: BigInt(Y0) * 10n ** BigInt(DECIMALS_OUT),
	decimalsIn: DECIMALS_IN,
	decimalsOut: DECIMALS_OUT,
};

const toPoolCoordinates = ({ x, y }: { x: number; y: number }) => {
	const xMin = 0.3 * X0;
	const xMax = 3.4 * X0;
	const yMax = Y0 / 0.3;
	const plotWidth = size.width - 2 * size.padding;
	const plotHeight = size.height - 2 * size.padding;
	return {
		reserveIn: xMin + ((x - size.padding) / plotWidth) * (xMax - xMin),
		reserveOut: ((size.height - size.padding - y) / plotHeight) * yMax,
	};
};

const expectOnCurve = (point: { x: number; y: number }) => {
	const { reserveIn, reserveOut } = toPoolCoordinates(point);
	expect((reserveIn * reserveOut) / (X0 * Y0)).toBeCloseTo(1, 6);
};

describe("getCurveGeometry", () => {
	it("places the current reserves on the curve", () => {
		const { now } = getCurveGeometry(pool, size);
		expect(now.reserveIn).toBe(X0);
		expect(now.reserveOut).toBe(Y0);
		expect(toPoolCoordinates(now).reserveIn).toBeCloseTo(X0, 4);
		expectOnCurve(now);
	});

	it("places every ladder point on x·y=k", () => {
		for (const point of getCurveGeometry(pool, size).ladder)
			expectOnCurve(point);
	});

	it("ladders trades of 10%, 50%, 100% and 200% of the input reserve", () => {
		const { ladder } = getCurveGeometry(pool, size);
		expect(ladder.map((step) => step.amountIn / X0)).toEqual([0.1, 0.5, 1, 2]);
	});

	it("fills a trade the size of the input reserve 50% below the spot rate", () => {
		const { ladder } = getCurveGeometry(pool, size);
		const doubling = ladder.find((step) => step.amountIn === X0);
		expect(doubling?.priceImpact).toBeCloseTo(0.5, 10);
		expect(ladder[0]?.priceImpact).toBeCloseTo(0.1 / 1.1, 10);
	});

	it("costs more and sits lower down the curve as trades grow", () => {
		const { ladder } = getCurveGeometry(pool, size);
		for (let i = 1; i < ladder.length; i++) {
			const [previous, current] = [ladder[i - 1], ladder[i]];
			expect(current?.priceImpact).toBeGreaterThan(previous?.priceImpact ?? 1);
			expect(current?.x).toBeGreaterThan(previous?.x ?? Infinity);
			expect(current?.y).toBeGreaterThan(previous?.y ?? Infinity);
		}
	});

	it("draws the curve from 0.3x to 3.4x the input reserve", () => {
		const { path } = getCurveGeometry(pool, size);
		const points = [...path.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map(
			([, x, y]) => ({ x: Number(x), y: Number(y) }),
		);
		expect(points).toHaveLength(121);
		expect(points[0]).toEqual({ x: size.padding, y: size.padding });
		expect(points.at(-1)?.x).toBeCloseTo(size.width - size.padding, 1);
	});

	it("shows the trade only when it is more than 0.1% of the input reserve", () => {
		const tokensIn = (tokens: number) =>
			BigInt(tokens) * 10n ** BigInt(DECIMALS_IN);

		expect(getCurveGeometry(pool, size).trade).toBeNull();
		expect(
			getCurveGeometry({ ...pool, amountIn: tokensIn(900) }, size).trade,
		).toBeNull();

		const { trade } = getCurveGeometry(
			{ ...pool, amountIn: tokensIn(X0 / 2) },
			size,
		);
		expect(trade?.amountIn).toBe(X0 / 2);
		expect(trade?.priceImpact).toBeCloseTo(1 / 3, 10);
		if (trade) expectOnCurve(trade);
	});
});
