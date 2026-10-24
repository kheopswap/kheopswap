import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	getInsufficientBalances,
	useTransactionBalanceCheck,
} from "./useTransactionBalanceCheck";

vi.mock("../../hooks/useBalances", () => ({
	useBalances: () => ({
		data: [
			{
				address: "5Signer",
				tokenId: "native::pah",
				balance: 0n,
				isLoading: true,
			},
		],
		isLoading: true,
	}),
}));
vi.mock("../../hooks/useBalance", () => ({
	useBalance: () => ({ data: undefined, isLoading: true }),
}));
vi.mock("../../hooks/useExistentialDeposits", () => ({
	useExistentialDeposits: () => ({
		data: { "native::pah": 10n },
		isLoading: false,
		error: undefined,
	}),
}));

describe("useTransactionBalanceCheck", () => {
	it("does not flag a cached balance that is still refreshing", () => {
		const { result } = renderHook(() =>
			useTransactionBalanceCheck({
				accountAddress: "5Signer",
				call: {} as never,
				callSpendings: { "native::pah": { plancks: 100n, allowDeath: true } },
				feeToken: { id: "native::pah" } as never,
				feeEstimate: 1n,
			}),
		);
		expect(result.current.insufficientBalances).toEqual({});
		expect(result.current.balances).toEqual({ "native::pah": undefined });
	});
});

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

	it("ignores a balance that is still loading", () => {
		expect(
			getInsufficientBalances({
				callSpendings: { "native::pah": { plancks: 100n, allowDeath: false } },
				balances: { "native::pah": undefined, "asset::pah::1984": 0n },
				existentialDeposits: { "native::pah": 10n, "asset::pah::1984": 1n },
				fee: { tokenId: "asset::pah::1984", plancks: 10n },
			}),
		).toEqual({ "asset::pah::1984": "Insufficient balance to pay for fee" });
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
