import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTransactionEthereum } from "./useTransactionEthereum";

const wallet = vi.hoisted(() => ({
	chainId: undefined as number | undefined,
	reportedChainId: 1,
	isPlaceholder: false,
	getChainId: vi.fn(async () => wallet.reportedChainId),
	switchChain: vi.fn(async () => {}),
}));

vi.mock("../../hooks/useWalletAccount", () => {
	const accounts = new Map<string, object>();
	return {
		useWalletAccount: () => {
			const key = `${wallet.chainId}:${wallet.isPlaceholder}`;
			if (!accounts.has(key))
				accounts.set(key, {
					id: "ethereum:0x1",
					platform: "ethereum",
					address: "0x1111111111111111111111111111111111111111",
					chainId: wallet.chainId,
					walletId: "injected",
					isPlaceholder: wallet.isPlaceholder,
					client: {
						getChainId: wallet.getChainId,
						switchChain: wallet.switchChain,
					},
				});
			return accounts.get(key);
		},
	};
});

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
	);

const targetChainId = () => renderEthereum().result.current.targetEvmChainId;

describe("useTransactionEthereum network mismatch", () => {
	beforeEach(() => {
		wallet.chainId = undefined;
		wallet.reportedChainId = 1;
		wallet.isPlaceholder = false;
		wallet.getChainId.mockClear();
		wallet.switchChain.mockClear();
	});

	it("treats a wallet that has not reported its chain as a mismatch", async () => {
		const { result } = renderEthereum();
		expect(result.current.targetEvmChainId).toBeTypeOf("number");
		expect(result.current.isEthereumNetworkMismatch).toBe(true);
		await waitFor(() => expect(wallet.getChainId).toHaveBeenCalled());
		expect(result.current.isEthereumNetworkMismatch).toBe(true);
	});

	it("reads the chain from the wallet when it has not reported one", async () => {
		wallet.reportedChainId = targetChainId() as number;
		const { result } = renderEthereum();
		await waitFor(() =>
			expect(result.current.isEthereumNetworkMismatch).toBe(false),
		);
		expect(result.current.connectedEvmChainId).toBe(wallet.reportedChainId);
	});

	it("rereads the chain after a switch", async () => {
		const { result } = renderEthereum();
		await waitFor(() => expect(wallet.getChainId).toHaveBeenCalled());
		expect(result.current.isEthereumNetworkMismatch).toBe(true);

		wallet.reportedChainId = targetChainId() as number;
		await act(() => result.current.onSwitchEthereumNetwork());

		expect(wallet.switchChain).toHaveBeenCalledWith({
			id: wallet.reportedChainId,
		});
		expect(result.current.isEthereumNetworkMismatch).toBe(false);
	});

	it("matches a wallet on the target chain", () => {
		wallet.chainId = targetChainId();
		expect(renderEthereum().result.current.isEthereumNetworkMismatch).toBe(
			false,
		);
	});

	it("flags a wallet on another chain", () => {
		wallet.chainId = 1;
		expect(renderEthereum().result.current.isEthereumNetworkMismatch).toBe(
			true,
		);
	});

	it("does not flag a placeholder account", () => {
		wallet.isPlaceholder = true;
		expect(renderEthereum().result.current.isEthereumNetworkMismatch).toBe(
			false,
		);
		expect(wallet.getChainId).not.toHaveBeenCalled();
	});
});
