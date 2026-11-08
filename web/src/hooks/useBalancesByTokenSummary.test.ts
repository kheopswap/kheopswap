import { renderHook, waitFor } from "@testing-library/react";
import { AccountId } from "polkadot-api";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { TokenId } from "../registry/tokens/types";
import type { AccountBalanceWithStable } from "../types/balances";
import {
	getBalancesByTokenSummary,
	useBalancesByTokenSummary,
} from "./useBalancesByTokenSummary";

vi.mock("../services/balances/service", () => ({
	getBalance$: () => of({ balance: 10n, status: "loaded" }),
}));

vi.mock("../state/prices", () => ({
	getStablePlancks$: (_tokenId: TokenId, plancks: bigint) =>
		of({ stablePlancks: plancks * 2n, isLoadingStablePlancks: false }),
}));

const tokenId = "native::hydration";

const balance = (
	overrides: Partial<AccountBalanceWithStable>,
): AccountBalanceWithStable => ({
	address: "5TestAddress",
	tokenId,
	tokenPlancks: 0n,
	isLoadingTokenPlancks: false,
	stablePlancks: null,
	isLoadingStablePlancks: false,
	...overrides,
});

const ethereumAccountBalance = balance({
	address: `0x${"ab".repeat(20)}`,
	tokenPlancks: null,
	isLoadingTokenPlancks: false,
});

describe("getBalancesByTokenSummary", () => {
	it("settles when an Ethereum account cannot hold the token", () => {
		const summary = getBalancesByTokenSummary([
			balance({ tokenPlancks: 0n }),
			ethereumAccountBalance,
		]);

		expect(summary[tokenId]).toMatchObject({
			tokenPlancks: 0n,
			isLoadingTokenPlancks: false,
			isInitializing: false,
		});
	});

	it("keeps initializing while a balance is still loading", () => {
		const summary = getBalancesByTokenSummary([
			balance({ tokenPlancks: 0n }),
			balance({
				address: "5Loading",
				tokenPlancks: null,
				isLoadingTokenPlancks: true,
			}),
		]);

		expect(summary[tokenId]?.isInitializing).toBe(true);
	});

	it("omits tokens that no account can hold", () => {
		expect(getBalancesByTokenSummary([ethereumAccountBalance])).toEqual({});
	});
});

describe("useBalancesByTokenSummary", () => {
	const publicKey = new Uint8Array(32).fill(7);
	const polkadotEncoding = AccountId(0).dec(publicKey);
	const genericEncoding = AccountId(42).dec(publicKey);
	const otherAccount = AccountId(42).dec(new Uint8Array(32).fill(9));

	const renderSummary = (accounts: string[]) =>
		renderHook(() =>
			useBalancesByTokenSummary({ tokens: [tokenId], accounts }),
		);

	it("counts an account connected through two wallets once", async () => {
		const { result } = renderSummary([
			genericEncoding,
			genericEncoding,
			otherAccount,
		]);
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.data[tokenId]).toMatchObject({
			tokenPlancks: 20n,
			stablePlancks: 40n,
		});
	});

	it("counts one public key once across address encodings", async () => {
		expect(polkadotEncoding).not.toBe(genericEncoding);
		const { result } = renderSummary([
			polkadotEncoding,
			genericEncoding,
			otherAccount,
		]);
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.data[tokenId]).toMatchObject({
			tokenPlancks: 20n,
			stablePlancks: 40n,
		});
	});
});
