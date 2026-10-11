import { describe, expect, it } from "vitest";
import { getHubSpokes } from "./getHubSpokes";

const options = { rMin: 90, rMax: 290 };

const stable = (tokens: number) => BigInt(Math.round(tokens * 1e6));

const poolsWithTvl = (tvls: (number | null)[]) =>
	tvls.map((tvl, poolAssetId) => ({
		poolAssetId,
		valuation: tvl === null ? null : stable(tvl),
	}));

describe("getHubSpokes", () => {
	it("returns no spokes for no pools", () => {
		expect(getHubSpokes([], options)).toEqual([]);
	});

	it.each([1, 2, 3, 4, 6, 12, 21, 23, 42, 46, 56, 69, 100])(
		"gives each of %i pools its own angle",
		(n) => {
			const pools = poolsWithTvl(Array.from({ length: n }, (_, i) => i * 10));
			const angles = getHubSpokes(pools, options).map((s) =>
				s.angle.toFixed(9),
			);
			expect(new Set(angles).size).toBe(n);
		},
	);

	it("spreads the six deepest pools at least 30° apart", () => {
		const pools = poolsWithTvl(
			Array.from({ length: 56 }, (_, i) => 1_000_000 - i),
		);
		const deepest = getHubSpokes(pools, options)
			.slice(0, 6)
			.map((s) => s.angle);
		for (const [i, a] of deepest.entries())
			for (const b of deepest.slice(i + 1)) {
				const gap = Math.abs(a - b) % (2 * Math.PI);
				expect(Math.min(gap, 2 * Math.PI - gap)).toBeGreaterThan(Math.PI / 6);
			}
	});

	it("ranks by valuation and grows the radius with it", () => {
		const pools = poolsWithTvl([5_000, 2_000_000, null, 80_000, 300]);
		const spokes = getHubSpokes(pools, options);

		expect(spokes.map((s) => s.poolAssetId)).toEqual([1, 3, 0, 4, 2]);
		expect(spokes.map((s) => s.rank)).toEqual([0, 1, 2, 3, 4]);
		for (let i = 1; i < spokes.length; i++)
			expect(spokes[i]?.radius).toBeLessThanOrEqual(spokes[i - 1]?.radius ?? 0);
		expect(spokes[0]?.radius).toBe(options.rMax);
		expect(spokes[spokes.length - 1]?.radius).toBe(options.rMin);
	});

	it("puts empty and unvalued pools at the inner radius", () => {
		const spokes = getHubSpokes(poolsWithTvl([1_000_000, 0, null]), options);
		expect(spokes.slice(1).map((s) => s.radius)).toEqual([
			options.rMin,
			options.rMin,
		]);
	});

	it("keeps every pool holding liquidity beyond empty pools", () => {
		const [, tiny, empty] = getHubSpokes(
			poolsWithTvl([5_936_000, 1_484, 0]),
			options,
		).map((s) => s.radius);
		expect(tiny).toBeGreaterThan(empty as number);
	});

	describe("on real pools", () => {
		const extension = (radius: number | undefined) =>
			((radius ?? 0) - options.rMin) / (options.rMax - options.rMin);

		it("sets Kusama's BNC far from empty pools, and USDt well below BNC", () => {
			const [, , bnc, usdt, empty] = getHubSpokes(
				poolsWithTvl([263.9, 203.1, 55.9, 2.252, 0]),
				options,
			).map((s) => extension(s.radius));
			expect(bnc).toBeGreaterThan(0.6);
			expect(usdt).toBeLessThan((bnc as number) / 2);
			expect(empty).toBe(0);
		});

		it("sets Polkadot's USDC far from empty pools", () => {
			const [, , usdc, , , empty] = getHubSpokes(
				poolsWithTvl([5_936_000, 2_277_000, 200_500, 5_331, 1_484, 0]),
				options,
			).map((s) => extension(s.radius));
			expect(usdc).toBeGreaterThan(0.4);
			expect(empty).toBe(0);
		});
	});

	it("scales radii to the deepest pool, whatever the stable unit", () => {
		const radii = (tvls: number[]) =>
			getHubSpokes(poolsWithTvl(tvls), options).map((s) => s.radius);
		const scaled = radii([264_000, 56_000, 2_000, 0]);
		for (const [i, radius] of radii([264, 56, 2, 0]).entries())
			expect(radius).toBeCloseTo(scaled[i] as number);
	});

	it("puts every pool at the outer radius when none has value", () => {
		const spokes = getHubSpokes(poolsWithTvl([0, null]), options);
		expect(spokes.map((s) => s.radius)).toEqual([290, 290]);
	});

	it("puts pools of equal depth at the outer radius", () => {
		const spokes = getHubSpokes(poolsWithTvl([500, 500, 500]), options);
		expect(spokes.map((s) => s.radius)).toEqual([290, 290, 290]);
	});
});
