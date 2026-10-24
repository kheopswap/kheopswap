import { describe, expect, it } from "vitest";
import {
	getMaxCapHint,
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
	it("leaves nothing to spend when the margin exceeds the balance", () => {
		expect(getSpendableBalance(5n, 10n)).toBe(0n);
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
		).toEqual({ amounts: [100n, 200n], cappedBy: null });
	});

	it("caps the chosen side when the other side's balance cannot follow", () => {
		expect(
			getMaxLiquidity({
				balances: [110n, 50n],
				reserves,
				margins: [10n, 0n],
				side: 0,
			}),
		).toEqual({ amounts: [25n, 50n], cappedBy: { side: 1, kept: 0n } });
	});

	it("reports what the capping side keeps for its margin", () => {
		expect(
			getMaxLiquidity({
				balances: [110n, 57n],
				reserves,
				margins: [10n, 7n],
				side: 0,
			}),
		).toEqual({ amounts: [25n, 50n], cappedBy: { side: 1, kept: 7n } });
	});

	it("offers nothing when the native balance cannot cover its margin", () => {
		expect(
			getMaxLiquidity({
				balances: [5n, 1000n],
				reserves,
				margins: [10n, 0n],
				side: 0,
			}),
		).toEqual({ amounts: [0n, 0n], cappedBy: null });
	});

	it("caps the asset side by the native balance net of its margin", () => {
		expect(
			getMaxLiquidity({
				balances: [30n, 1000n],
				reserves,
				margins: [10n, 0n],
				side: 1,
			}),
		).toEqual({ amounts: [20n, 40n], cappedBy: { side: 0, kept: 10n } });
	});
});

describe("getMaxCapHint", () => {
	const usdc = { decimals: 6, symbol: "USDC" };

	it("names what the capping side keeps", () => {
		expect(getMaxCapHint(71_466n, usdc)).toBe(
			"Limits the max, keeps 0.0715 USDC",
		);
	});

	it("only flags the cap when nothing is kept", () => {
		expect(getMaxCapHint(0n, usdc)).toBe("Limits the max");
	});
});
