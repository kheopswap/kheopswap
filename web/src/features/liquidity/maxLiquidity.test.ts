import { describe, expect, it } from "vitest";
import {
	getMaxLiquidity,
	getSpendableBalance,
	getSpendingMargin,
} from "./maxLiquidity";

const PAS = { id: "native::pasah" };
const USDC = { id: "asset::pasah::1337" };

describe("getSpendingMargin", () => {
	it("reserves twice the fee and the existential deposit when the token pays the fee", () => {
		expect(
			getSpendingMargin({
				token: PAS,
				feeToken: PAS,
				feeEstimate: 10n,
				existentialDeposit: 100n,
			}),
		).toBe(120n);
	});

	it("reserves only the existential deposit when another token pays the fee", () => {
		expect(
			getSpendingMargin({
				token: USDC,
				feeToken: PAS,
				feeEstimate: undefined,
				existentialDeposit: 7n,
			}),
		).toBe(7n);
	});

	it("is unknown while the existential deposit is unknown", () => {
		expect(
			getSpendingMargin({
				token: USDC,
				feeToken: PAS,
				feeEstimate: 10n,
				existentialDeposit: undefined,
			}),
		).toBeNull();
		expect(
			getSpendingMargin({
				token: USDC,
				feeToken: PAS,
				feeEstimate: 10n,
				existentialDeposit: null,
			}),
		).toBeNull();
	});

	it("is unknown while the fee of the paying token is still being estimated", () => {
		expect(
			getSpendingMargin({
				token: PAS,
				feeToken: PAS,
				feeEstimate: undefined,
				existentialDeposit: 100n,
			}),
		).toBeNull();
		expect(
			getSpendingMargin({
				token: PAS,
				feeToken: undefined,
				feeEstimate: 10n,
				existentialDeposit: 100n,
			}),
		).toBeNull();
	});
});

describe("getSpendableBalance", () => {
	it("keeps the margin out of the balance", () => {
		expect(getSpendableBalance(110n, 10n)).toBe(100n);
	});

	it("is zero when the balance does not cover the margin", () => {
		expect(getSpendableBalance(5n, 10n)).toBe(0n);
		expect(getSpendableBalance(10n, 10n)).toBe(0n);
	});
});

describe("getMaxLiquidity", () => {
	const reserves = [1000n, 2000n] as const;

	it("fills the chosen side and derives the other from the pool ratio", () => {
		expect(
			getMaxLiquidity({
				balances: [110n, 1000n],
				reserves,
				margins: [10n, 0n],
				side: 0,
			}),
		).toEqual([100n, 200n]);
	});

	it("caps the chosen side when the other side's balance cannot follow", () => {
		expect(
			getMaxLiquidity({
				balances: [110n, 50n],
				reserves,
				margins: [10n, 0n],
				side: 0,
			}),
		).toEqual([25n, 50n]);
	});

	it("caps the asset side by the native balance net of its margin", () => {
		expect(
			getMaxLiquidity({
				balances: [30n, 1000n],
				reserves,
				margins: [10n, 0n],
				side: 1,
			}),
		).toEqual([20n, 40n]);
	});

	it("offers nothing when the chosen side cannot cover its margin", () => {
		expect(
			getMaxLiquidity({
				balances: [5n, 1000n],
				reserves,
				margins: [10n, 0n],
				side: 0,
			}),
		).toEqual([0n, 0n]);
	});
});
