import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTransactionEthereum } from "./useTransactionEthereum";

const wallet = vi.hoisted(() => ({
	chainId: undefined as number | undefined,
}));

vi.mock("../../hooks/useWalletAccount", () => ({
	useWalletAccount: () => ({
		id: "ethereum:0x1",
		platform: "ethereum",
		address: "0x1111111111111111111111111111111111111111",
		chainId: wallet.chainId,
		walletId: "injected",
		isPlaceholder: false,
		client: {},
	}),
}));

vi.mock("../../common/kheopskit", () => ({
	useWallets: () => ({ wallets: [] }),
	isWalletConnectWallet: () => false,
	getEvmAppKitNetwork: () => undefined,
}));

vi.mock("../../hooks/useNativeToken", () => ({
	useNativeToken: () => ({ symbol: "DOT" }),
}));

const renderEthereum = () =>
	renderHook(() =>
		useTransactionEthereum({ signer: "ethereum:0x1", chainId: "pah" }),
	).result.current;

describe("useTransactionEthereum network mismatch", () => {
	beforeEach(() => {
		wallet.chainId = undefined;
	});

	it("treats a wallet that has not reported its chain as a mismatch", () => {
		const { isEthereumNetworkMismatch, targetEvmChainId } = renderEthereum();
		expect(targetEvmChainId).toBeTypeOf("number");
		expect(isEthereumNetworkMismatch).toBe(true);
	});

	it("matches a wallet on the target chain", () => {
		wallet.chainId = renderEthereum().targetEvmChainId;
		expect(renderEthereum().isEthereumNetworkMismatch).toBe(false);
	});

	it("flags a wallet on another chain", () => {
		wallet.chainId = 1;
		expect(renderEthereum().isEthereumNetworkMismatch).toBe(true);
	});
});
