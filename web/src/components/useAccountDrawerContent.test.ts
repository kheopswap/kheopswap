import { renderHook, waitFor } from "@testing-library/react";
import { AccountId } from "polkadot-api";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { useAccountDrawerContent } from "./useAccountDrawerContent";

const publicKey = new Uint8Array(32).fill(7);
const accounts = [
	{ id: "talisman::a", address: AccountId(42).dec(publicKey) },
	{ id: "subwallet::a", address: AccountId(0).dec(publicKey) },
];

vi.mock("../common/kheopskit", () => ({
	isInjectedWallet: () => true,
	isWalletConnectWallet: () => false,
	useWallets: () => ({ accounts, wallets: [] }),
}));

vi.mock("../hooks/useToken", () => ({
	useToken: () => ({ data: { id: "native::pasah" }, isLoading: false }),
}));

vi.mock("../state/relay", () => ({
	useRelayChains: () => ({ stableToken: { id: "native::pasah" } }),
}));

vi.mock("../services/balances/service", () => ({
	getBalance$: () => of({ balance: 10n, status: "loaded" }),
}));

vi.mock("../state/prices", () => ({
	getStablePlancks$: () =>
		of({ stablePlancks: 20n, isLoadingStablePlancks: false }),
}));

describe("useAccountDrawerContent", () => {
	it("shows the balance of an account under each wallet's address encoding", async () => {
		const { result } = renderHook(() =>
			useAccountDrawerContent({ tokenId: "native::pasah" }),
		);
		await waitFor(() =>
			expect(Object.keys(result.current.balanceByAccount)).toHaveLength(2),
		);
		for (const { address } of accounts)
			expect(result.current.balanceByAccount[address]).toMatchObject({
				tokenPlancks: 10n,
				stablePlancks: 20n,
			});
	});
});
