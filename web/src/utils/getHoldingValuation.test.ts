import { describe, expect, it } from "vitest";
import { getAmmOutput } from "./ammMath";
import { getHoldingValuation } from "./getHoldingValuation";

const NATIVE = "native::pah";
const STABLE = "asset::pah::1337";
const TOKEN = "asset::pah::42";
const LP_FEE = 3000;
const FLOOR = 100_000_000n;

const valuation = (
	overrides: Partial<Parameters<typeof getHoldingValuation>[0]>,
) =>
	getHoldingValuation({
		plancks: 1_000n,
		tokenId: TOKEN,
		nativeTokenId: NATIVE,
		stableTokenId: STABLE,
		reservesNativeToToken: [10_000_000_000n, 20_000_000_000n],
		reservesNativeToStable: [10_000_000_000n, 40_000_000_000n],
		lpFee: LP_FEE,
		lowLiquidityFloorStablePlancks: FLOOR,
		...overrides,
	});

describe("getHoldingValuation", () => {
	it("values a holding at what selling it through the pool returns, then at the stable spot rate", () => {
		const { amountOut } = getAmmOutput(
			1_000n,
			20_000_000_000n,
			10_000_000_000n,
			LP_FEE,
		);
		expect(valuation({})).toEqual({
			stablePlancks: amountOut * 4n,
			isLowLiquidity: false,
		});
	});

	it("never values a holding above the pool's native reserve", () => {
		const { stablePlancks } = valuation({
			plancks: 10n ** 30n,
			reservesNativeToToken: [5_000_000_000n, 1_000n],
		});
		expect(stablePlancks).toBeLessThan(5_000_000_000n * 4n);
	});

	it("marks a pool whose native side is under the floor as low liquidity and leaves it unpriced", () => {
		expect(
			valuation({ reservesNativeToToken: [20_000_000n, 1_000_000n] }),
		).toEqual({ stablePlancks: null, isLowLiquidity: true });
	});

	it("values the native token at the stable spot rate", () => {
		expect(valuation({ tokenId: NATIVE, plancks: 1_000n })).toEqual({
			stablePlancks: 4_000n,
			isLowLiquidity: false,
		});
	});

	it("values the stable token as itself", () => {
		expect(valuation({ tokenId: STABLE, plancks: 1_000n })).toEqual({
			stablePlancks: 1_000n,
			isLowLiquidity: false,
		});
	});

	it("skips the stable leg when the native token is the stable token", () => {
		const { amountOut } = getAmmOutput(
			1_000n,
			20_000_000_000n,
			10_000_000_000n,
			LP_FEE,
		);
		expect(
			valuation({ stableTokenId: NATIVE, reservesNativeToStable: null }),
		).toEqual({ stablePlancks: amountOut, isLowLiquidity: false });
	});

	it("leaves a token without a pool unpriced", () => {
		expect(valuation({ reservesNativeToToken: null })).toEqual({
			stablePlancks: null,
			isLowLiquidity: false,
		});
		expect(valuation({ reservesNativeToToken: [0n, 1_000n] })).toEqual({
			stablePlancks: null,
			isLowLiquidity: false,
		});
	});

	it("values an empty holding at zero", () => {
		expect(valuation({ plancks: 0n }).stablePlancks).toBe(0n);
	});
});
