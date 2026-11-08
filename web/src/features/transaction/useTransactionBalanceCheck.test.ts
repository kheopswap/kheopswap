import { describe, expect, it } from "vitest";
import { getXcmCallSpendings } from "../swap/routes/xcm/xcmQuote";
import { getInsufficientBalances } from "./useTransactionBalanceCheck";

const HYDRATION_DOT = "hydration-asset::hydration::5";
const HDX = "native::hydration";
const DOT_ED = 10_000_000n;
const FEE_IN_DOT = 35_052_000n;
const FEE_IN_HDX = 560_953_011_092n;
const ONE_DOT = 10_000_000_000n;

const held = (balance: bigint, frozen = 0n) => ({ balance, frozen });

describe("getInsufficientBalances", () => {
	it.each([
		[
			"a DOT payer sending all their DOT cannot pay the fee",
			{ [HYDRATION_DOT]: held(ONE_DOT) },
			{ tokenId: HYDRATION_DOT, plancks: FEE_IN_DOT },
			ONE_DOT,
			{ [HYDRATION_DOT]: "Insufficient balance to pay for fee" },
		],
		[
			"a DOT payer keeping the fee in DOT can send the rest",
			{ [HYDRATION_DOT]: held(ONE_DOT) },
			{ tokenId: HYDRATION_DOT, plancks: FEE_IN_DOT },
			ONE_DOT - FEE_IN_DOT,
			{},
		],
		[
			"an HDX payer without HDX cannot pay the fee",
			{ [HYDRATION_DOT]: held(ONE_DOT), [HDX]: held(0n) },
			{ tokenId: HDX, plancks: FEE_IN_HDX },
			ONE_DOT,
			{ [HDX]: "Insufficient balance to pay for fee" },
		],
		[
			"an HDX payer with HDX can send all their DOT",
			{ [HYDRATION_DOT]: held(ONE_DOT), [HDX]: held(10n * FEE_IN_HDX) },
			{ tokenId: HDX, plancks: FEE_IN_HDX },
			ONE_DOT,
			{},
		],
		[
			"sending more than the balance",
			{ [HYDRATION_DOT]: held(ONE_DOT) },
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
				balances: { [HYDRATION_DOT]: held(FEE_IN_DOT + 1n) },
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
				balances: { "asset::pah::1337": held(153n) },
				existentialDeposits: { "asset::pah::1337": 150n },
				fee: { tokenId: "asset::pah::1337", plancks: 7n },
			}),
		).toEqual({ "asset::pah::1337": "Insufficient balance to pay for fee" });
	});

	it.each([
		[
			"a Paseo Asset Hub sender",
			"native::pasah",
			45_766_345_714_553n,
			100_000_000n,
			11_056_171n,
			304_950_000n,
			45_765_935_236_468n,
		],
		[
			"a Polkadot People sender",
			"native::ppeople",
			174_618_608_715n,
			1_000_000_000n,
			10_123_336n,
			304_850_000n,
			173_613_547_047n,
		],
	])(
		"blocks a native cross-chain send that leaves %s less than the deposit and the fee",
		(_, tokenId, free, ed, transactionFee, deliveryFee, amount) => {
			expect(
				getInsufficientBalances({
					callSpendings: getXcmCallSpendings({
						tokenIdIn: tokenId,
						totalIn: amount,
						deliveryFee: { tokenId, plancks: deliveryFee },
					}),
					balances: { [tokenId]: held(free) },
					existentialDeposits: { [tokenId]: ed },
					fee: { tokenId, plancks: transactionFee },
				}),
			).toEqual({ [tokenId]: "Insufficient balance to keep account alive" });
		},
	);

	it("keeps the fee payer alive when the call must not reap it", () => {
		expect(
			getInsufficientBalances({
				callSpendings: { "native::pah": { plancks: 100n, allowDeath: false } },
				balances: { "native::pah": held(115n) },
				existentialDeposits: { "native::pah": 10n },
				fee: { tokenId: "native::pah", plancks: 10n },
			}),
		).toEqual({ "native::pah": "Insufficient balance to keep account alive" });
	});

	it.each([
		["spending down to the frozen funds", 916_441_731_750n, {}],
		[
			"spending one plank past the frozen funds",
			916_441_731_751n,
			{ "native::pasah": "Insufficient balance to pay for fee" },
		],
	])(
		"reserves no deposit on top of frozen funds that already exceed it when %s",
		(_, plancks, expected) => {
			expect(
				getInsufficientBalances({
					callSpendings: { "native::pasah": { plancks, allowDeath: false } },
					balances: {
						"native::pasah": held(916_450_889_570n, 5_000_000_000n),
					},
					existentialDeposits: { "native::pasah": 100_000_000n },
					fee: { tokenId: "native::pasah", plancks: 9_157_820n },
				}),
			).toEqual(expected);
		},
	);

	it.each([
		["the deposit net of the frozen funds stays", 130n, {}],
		[
			"one plank less than that stays",
			131n,
			{ "native::pah": "Insufficient balance to keep account alive" },
		],
	])(
		"reserves only the part of the deposit the frozen funds do not cover when %s",
		(_, plancks, expected) => {
			expect(
				getInsufficientBalances({
					callSpendings: { "native::pah": { plancks, allowDeath: false } },
					balances: { "native::pah": held(200n, 40n) },
					existentialDeposits: { "native::pah": 100n },
					fee: { tokenId: "native::pah", plancks: 10n },
				}),
			).toEqual(expected);
		},
	);

	it("lets a fee payer whose frozen funds exceed the deposit pay the fee with its last spendable plancks", () => {
		expect(
			getInsufficientBalances({
				callSpendings: {},
				balances: { "native::pah": held(10n, 100n) },
				existentialDeposits: { "native::pah": 10n },
				fee: { tokenId: "native::pah", plancks: 10n },
			}),
		).toEqual({});
	});
});
