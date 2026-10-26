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
			status: "priced",
			stablePlancks: amountOut * 4n,
		});
	});

	it("flags a holding that would drain its pool instead of valuing it at the whole reserve", () => {
		expect(
			valuation({
				plancks: 10n ** 30n,
				reservesNativeToToken: [5_000_000_000n, 1_000n],
			}),
		).toEqual({ status: "holding-dwarfs-pool", stablePlancks: null });
	});

	it("flags a holding whose exit value is under half of its spot value", () => {
		const reserves: [bigint, bigint] = [10_000_000_000n, 10_000_000_000n];
		expect(
			valuation({ plancks: 10_000_000_000n, reservesNativeToToken: reserves })
				.status,
		).toBe("holding-dwarfs-pool");
		expect(
			valuation({ plancks: 5_000_000_000n, reservesNativeToToken: reserves })
				.status,
		).toBe("priced");
	});

	it("marks a pool whose native side is under the floor as thin and leaves it unpriced", () => {
		expect(
			valuation({ reservesNativeToToken: [20_000_000n, 1_000_000n] }),
		).toEqual({ status: "thin-pool", stablePlancks: null });
	});

	it("values the native token at the stable spot rate", () => {
		expect(valuation({ tokenId: NATIVE, plancks: 1_000n })).toEqual({
			status: "priced",
			stablePlancks: 4_000n,
		});
	});

	it("values the stable token as itself", () => {
		expect(valuation({ tokenId: STABLE, plancks: 1_000n })).toEqual({
			status: "priced",
			stablePlancks: 1_000n,
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
		).toEqual({ status: "priced", stablePlancks: amountOut });
	});

	it("leaves a token without a pool unpriced, distinct from low liquidity", () => {
		expect(valuation({ reservesNativeToToken: null })).toEqual({
			status: "unpriced",
			stablePlancks: null,
		});
		expect(valuation({ reservesNativeToToken: [0n, 1_000n] })).toEqual({
			status: "unpriced",
			stablePlancks: null,
		});
		expect(valuation({ reservesNativeToStable: null })).toEqual({
			status: "unpriced",
			stablePlancks: null,
		});
	});

	it("values an empty holding at zero", () => {
		expect(valuation({ plancks: 0n })).toEqual({
			status: "priced",
			stablePlancks: 0n,
		});
	});
});
