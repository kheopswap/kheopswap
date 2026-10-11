import { describe, expect, it } from "vitest";
import { getHubSpokes } from "./getHubSpokes";

const STABLE_DECIMALS = 6;
const options = { stableDecimals: STABLE_DECIMALS, rMin: 90, rMax: 290 };

const stable = (tokens: number) => BigInt(tokens) * 10n ** 6n;

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

	it("puts every pool under the floor at the inner radius", () => {
		const spokes = getHubSpokes(
			poolsWithTvl([1_000_000, 99, 5, null]),
			options,
		);
		const belowFloor = spokes.filter((s) => s.poolAssetId !== 0);
		expect(belowFloor.map((s) => s.radius)).toEqual([
			options.rMin,
			options.rMin,
			options.rMin,
		]);
	});

	it("maps radius on a log scale", () => {
		const spokes = getHubSpokes(
			poolsWithTvl([1_000_000, 10_000, 100]),
			options,
		);
		expect(spokes[1]?.radius).toBeCloseTo((options.rMin + options.rMax) / 2);
	});

	it("puts pools of equal depth at the outer radius", () => {
		const spokes = getHubSpokes(poolsWithTvl([500, 500, 500]), options);
		expect(spokes.map((s) => s.radius)).toEqual([290, 290, 290]);
	});
});
