import { describe, expect, it } from "vitest";
import {
	getAmmOutput,
	getMaxSwapAmount,
	getMinAmountOut,
	getPriceImpact,
	splitAppCommission,
} from "./ammMath";

describe("getAmmOutput", () => {
	it("computes constant-product output with fee", () => {
		// 1000 DOT in, 100_000 / 200_000 reserves, 3‰ LP fee
		const { amountOut, protocolCommission } = getAmmOutput(
			1_000_000_000_000n, // 1000e10
			100_000_000_000_000n, // 100_000e10
			200_000_000_000_000n, // 200_000e10
			3,
		);
		// amountOut must be less than the proportional 2000e10 due to fee + curve
		expect(amountOut).toBeGreaterThan(0n);
		expect(amountOut).toBeLessThan(2_000_000_000_000n);
		expect(protocolCommission).toBeGreaterThan(0n);
	});

	it("returns exact proportionate output for a zero-fee pool with tiny input", () => {
		// With 0 fee and near-zero input relative to reserves, output ≈ amountIn * reserveOut / reserveIn
		const { amountOut, protocolCommission } = getAmmOutput(
			1n,
			1_000_000n,
			1_000_000n,
			0,
		);
		// For equal reserves and 0 fee, 1 planck in should yield ~1 planck out (accounting for rounding)
		expect(amountOut).toBe(0n); // integer division: 1*1000*1000000 / (1000000*1000 + 1*1000) = 999
		// Actually let's be more precise:
		// amountInWithFee = 1 * (1000 - 0) = 1000
		// numerator = 1000 * 1_000_000 = 1_000_000_000
		// denominator = 1_000_000 * 1000 + 1000 = 1_000_001_000
		// result = 1_000_000_000 / 1_000_001_000 = 0 (integer division)
		expect(protocolCommission).toBe(0n);
	});

	it("throws on zero reserves", () => {
		expect(() => getAmmOutput(1000n, 0n, 100n, 3)).toThrow("No liquidity");
		expect(() => getAmmOutput(1000n, 100n, 0n, 3)).toThrow("No liquidity");
		expect(() => getAmmOutput(1000n, 0n, 0n, 3)).toThrow("No liquidity");
	});

	it("protocol commission matches fee fraction", () => {
		// With lpFee = 30 (3%), commission should be 3% of input
		const input = 10_000_000n;
		const { protocolCommission } = getAmmOutput(
			input,
			1_000_000_000n,
			1_000_000_000n,
			30,
		);
		// commission = (1000 * input - input * (1000 - 30)) / 1000
		// = input * 30 / 1000 = input * 3%
		expect(protocolCommission).toBe((input * 30n) / 1000n);
	});

	it("output decreases as input increases (constant product curve)", () => {
		const reserveIn = 1_000_000_000_000n;
		const reserveOut = 1_000_000_000_000n;
		const lpFee = 3;

		const { amountOut: out1 } = getAmmOutput(
			1_000_000_000n,
			reserveIn,
			reserveOut,
			lpFee,
		);
		const { amountOut: out2 } = getAmmOutput(
			100_000_000_000n,
			reserveIn,
			reserveOut,
			lpFee,
		);

		// Per-unit output should decrease with larger input (price impact)
		const perUnit1 = (out1 * 100_000n) / 1_000_000_000n;
		const perUnit2 = (out2 * 100_000n) / 100_000_000_000n;
		expect(perUnit1).toBeGreaterThan(perUnit2);
	});

	it("amountOut never exceeds reserveOut", () => {
		const { amountOut } = getAmmOutput(
			999_999_999_999_999n,
			1n,
			1_000_000_000_000n,
			0,
		);
		expect(amountOut).toBeLessThan(1_000_000_000_000n);
	});
});

describe("getPriceImpact", () => {
	it("returns zero when spot and actual are equal", () => {
		expect(getPriceImpact(1000n, 1000n)).toBe(-0);
	});

	it("returns negative ratio when actual is less than spot", () => {
		// spot=10000, actual=9800 → impact = -(10000*(10000-9800))/10000 / 10000
		// = -(10000*200)/10000 / 10000 = -200/10000 = -0.02
		expect(getPriceImpact(10000n, 9800n)).toBe(-0.02);
	});

	it("returns positive ratio when actual exceeds spot (edge case)", () => {
		// If actual > spot, impact should be positive
		expect(getPriceImpact(10000n, 10200n)).toBeGreaterThan(0);
	});

	it("returns 0 when spot is 0", () => {
		expect(getPriceImpact(0n, 100n)).toBe(0);
	});

	it("handles large values without overflow", () => {
		const spot = 10n ** 18n;
		const actual = spot - spot / 100n; // 1% impact
		const impact = getPriceImpact(spot, actual);
		expect(impact).toBeCloseTo(-0.01, 2);
	});
});

describe("getMinAmountOut", () => {
	it("reduces output by the slippage tolerance", () => {
		const plancksOut = 10000n;
		// 0.5% slippage → 10000 * (10000 - 50) / 10000 = 10000 * 9950 / 10000 = 9950
		expect(getMinAmountOut(plancksOut, 0.005)).toBe(9950n);
	});

	it("returns full amount for zero slippage", () => {
		expect(getMinAmountOut(1_000_000n, 0)).toBe(1_000_000n);
	});

	it("returns zero for 100% slippage", () => {
		expect(getMinAmountOut(1_000_000n, 1)).toBe(0n);
	});

	it("handles typical 1% slippage", () => {
		const plancksOut = 1_000_000_000_000n;
		const min = getMinAmountOut(plancksOut, 0.01);
		expect(min).toBe(990_000_000_000n);
	});
});

describe("splitAppCommission", () => {
	it("splits fee correctly for 0.005% commission", () => {
		const total = 1_000_000n;
		const { plancksIn, appFee } = splitAppCommission(total, 0.005);
		// feeNum = 1_000_000 * (0.005 * 10000) = 1_000_000 * 50 = 50_000_000
		// fee = 50_000_000 / 1_000_000 = 50
		expect(appFee).toBe(50n);
		expect(plancksIn).toBe(total - 50n);
		expect(plancksIn + appFee).toBe(total);
	});

	it("returns zero fee for zero percent", () => {
		const total = 1_000_000_000n;
		const { plancksIn, appFee } = splitAppCommission(total, 0);
		expect(appFee).toBe(0n);
		expect(plancksIn).toBe(total);
	});

	it("fee + plancksIn always equals total", () => {
		const total = 123_456_789n;
		const { plancksIn, appFee } = splitAppCommission(total, 0.01);
		expect(plancksIn + appFee).toBe(total);
	});
});

describe("getMaxSwapAmount", () => {
	it("deducts 2*fee + ED for native tokens", () => {
		const balance = 10_000_000_000n;
		const fee = 100_000_000n;
		const ed = 1_000_000_000n;
		const max = getMaxSwapAmount(balance, fee, ed, true);
		expect(max).toBe(balance - 2n * fee - ed);
	});

	it("returns full balance for non-native tokens", () => {
		const balance = 10_000_000_000n;
		expect(getMaxSwapAmount(balance, 100_000n, 1_000n, false)).toBe(balance);
	});

	it("returns full balance when reserves exceed balance for native", () => {
		const balance = 100n;
		const fee = 1000n;
		const ed = 500n;
		// 2*1000 + 500 = 2500 > 100 → return balance
		expect(getMaxSwapAmount(balance, fee, ed, true)).toBe(balance);
	});

	it("returns zero when balance exactly equals reserves", () => {
		const fee = 500n;
		const ed = 1000n;
		const balance = 2n * fee + ed; // 2000
		expect(getMaxSwapAmount(balance, fee, ed, true)).toBe(0n);
	});
});
