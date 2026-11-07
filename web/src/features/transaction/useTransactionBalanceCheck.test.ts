import { describe, expect, it } from "vitest";
import { getXcmCallSpendings } from "../swap/routes/xcm/xcmQuote";
import { getInsufficientBalances } from "./useTransactionBalanceCheck";

const HYDRATION_DOT = "hydration-asset::hydration::5";
const HDX = "native::hydration";
const DOT_ED = 10_000_000n;
const FEE_IN_DOT = 35_052_000n;
const FEE_IN_HDX = 560_953_011_092n;
const ONE_DOT = 10_000_000_000n;

describe("getInsufficientBalances", () => {
	it.each([
		[
			"a DOT payer sending all their DOT cannot pay the fee",
			{ [HYDRATION_DOT]: ONE_DOT },
			{ tokenId: HYDRATION_DOT, plancks: FEE_IN_DOT },
			ONE_DOT,
			{ [HYDRATION_DOT]: "Insufficient balance to pay for fee" },
		],
		[
			"a DOT payer keeping the fee in DOT can send the rest",
			{ [HYDRATION_DOT]: ONE_DOT },
			{ tokenId: HYDRATION_DOT, plancks: FEE_IN_DOT },
			ONE_DOT - FEE_IN_DOT,
			{},
		],
		[
			"an HDX payer without HDX cannot pay the fee",
			{ [HYDRATION_DOT]: ONE_DOT, [HDX]: 0n },
			{ tokenId: HDX, plancks: FEE_IN_HDX },
			ONE_DOT,
			{ [HDX]: "Insufficient balance to pay for fee" },
		],
		[
			"an HDX payer with HDX can send all their DOT",
			{ [HYDRATION_DOT]: ONE_DOT, [HDX]: 10n * FEE_IN_HDX },
			{ tokenId: HDX, plancks: FEE_IN_HDX },
			ONE_DOT,
			{},
		],
		[
			"sending more than the balance",
			{ [HYDRATION_DOT]: ONE_DOT },
			{ tokenId: HYDRATION_DOT, plancks: FEE_IN_DOT },
			ONE_DOT + 1n,
			{ [HYDRATION_DOT]: "Insufficient balance" },
		],
	])("%s", (_, balances, fee, sent, expected) => {
		expect(
			getInsufficientBalances({
				callSpendings: {
					[HYDRATION_DOT]: { plancks: sent, allowDeath: true },
				},
				balances,
				existentialDeposits: { [HYDRATION_DOT]: DOT_ED, [HDX]: 10n ** 12n },
				fee,
			}),
		).toEqual(expected);
	});

	it("lets a Hydration fee payer spend down to the fee, which may reap the fee currency", () => {
		expect(
			getInsufficientBalances({
				callSpendings: { [HYDRATION_DOT]: { plancks: 1n, allowDeath: true } },
				balances: { [HYDRATION_DOT]: FEE_IN_DOT + 1n },
				existentialDeposits: { [HYDRATION_DOT]: DOT_ED },
				fee: { tokenId: HYDRATION_DOT, plancks: FEE_IN_DOT },
			}),
		).toEqual({});
	});

	it("keeps the fee payer alive through the fee even when the call may reap it", () => {
		expect(
			getInsufficientBalances({
				callSpendings: {
					"asset::pah::1337": { plancks: 1n, allowDeath: true },
				},
				balances: { "asset::pah::1337": 153n },
				existentialDeposits: { "asset::pah::1337": 150n },
				fee: { tokenId: "asset::pah::1337", plancks: 7n },
			}),
		).toEqual({ "asset::pah::1337": "Insufficient balance to pay for fee" });
	});

	it("lets a native teleport empty the sender, as the chain does", () => {
		const free = 40_844_677_641n;
		const transactionFee = 2_000_000n;
		const deliveryFee = { tokenId: "native::pasah", plancks: 304_850_000n };
		expect(
			getInsufficientBalances({
				callSpendings: getXcmCallSpendings({
					tokenIdIn: "native::pasah",
					totalIn: free - transactionFee - deliveryFee.plancks,
					deliveryFee,
				}),
				balances: { "native::pasah": free },
				existentialDeposits: { "native::pasah": 100_000_000n },
				fee: { tokenId: "native::pasah", plancks: transactionFee },
			}),
		).toEqual({});
	});

	it("keeps the fee payer alive when the call must not reap it", () => {
		expect(
			getInsufficientBalances({
				callSpendings: { "native::pah": { plancks: 100n, allowDeath: false } },
				balances: { "native::pah": 115n },
				existentialDeposits: { "native::pah": 10n },
				fee: { tokenId: "native::pah", plancks: 10n },
			}),
		).toEqual({ "native::pah": "Insufficient balance to keep account alive" });
	});
});
