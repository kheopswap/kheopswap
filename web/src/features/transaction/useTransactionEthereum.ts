import type { AppKit } from "@reown/appkit";
import { useCallback, useMemo, useState } from "react";
import {
	getEvmAppKitNetwork,
	isWalletConnectWallet,
	useWallets,
} from "../../common/kheopskit";
import { useNativeToken } from "../../hooks/useNativeToken";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import { getChainById } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { notifyError } from "../../utils/notifyError";

/** EIP-1193 code 4001 = user rejected the request. */
const isUserRejection = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code: unknown }).code === 4001;

/**
 * True when the wallet can't switch/add a chain from the dapp — e.g. mobile
 * WalletConnect wallets that don't implement the chain-management RPC methods.
 * Covers JSON-RPC -32601 (method not found), EIP-1193 4200 (unsupported method)
 * and the matching error messages viem surfaces.
 */
const isUnsupportedSwitch = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null) return false;
	const code = "code" in error ? (error as { code: unknown }).code : undefined;
	if (code === -32601 || code === 4200) return true;
	const message =
		"message" in error &&
		typeof (error as { message: unknown }).message === "string"
			? (error as { message: string }).message.toLowerCase()
			: "";
	return (
		message.includes("does not exist") ||
		message.includes("not available") ||
		message.includes("method not found") ||
		message.includes("not supported")
	);
};

type UseTransactionEthereumProps = {
	signer: string | null | undefined;
	chainId: ChainId | null | undefined;
};

export const useTransactionEthereum = ({
	signer,
	chainId,
}: UseTransactionEthereumProps) => {
	const account = useWalletAccount({ id: signer });
	const { wallets } = useWallets();
	const [isSwitchingEthereumNetwork, setIsSwitchingEthereumNetwork] =
		useState(false);

	const chain = useMemo(
		() => (chainId ? getChainById(chainId) : null),
		[chainId],
	);

	const isEthereumAccount = account?.platform === "ethereum";
	const nativeToken = useNativeToken({ chain });

	const targetEvmChainId = chain?.evmChainId;
	const connectedEvmChainId = useMemo(
		() => (account?.platform === "ethereum" ? account.chainId : undefined),
		[account],
	);

	// AppKit instance backing this account when it's connected over
	// WalletConnect — the escape hatch kheopskit exposes on the WC connector.
	const walletConnectAppKit = useMemo(() => {
		if (!account) return null;
		const wallet = wallets.find((w) => w.id === account.walletId);
		return wallet && isWalletConnectWallet(wallet)
			? (wallet.appKit as unknown as AppKit)
			: null;
	}, [wallets, account]);

	const isEthereumNetworkMismatch = useMemo(() => {
		if (!isEthereumAccount) return false;
		if (!targetEvmChainId || !connectedEvmChainId) return false;
		return targetEvmChainId !== connectedEvmChainId;
	}, [connectedEvmChainId, isEthereumAccount, targetEvmChainId]);

	const onSwitchEthereumNetwork = useCallback(async () => {
		if (!isEthereumAccount || !targetEvmChainId) return;

		try {
			setIsSwitchingEthereumNetwork(true);

			// WalletConnect sessions don't support the injected-wallet chain RPC
			// methods (wallet_switchEthereumChain / wallet_addEthereumChain), so
			// switch the active network through AppKit instead.
			if (walletConnectAppKit) {
				const network = getEvmAppKitNetwork(targetEvmChainId);
				if (!network)
					throw new Error(
						`No AppKit network configured for chain ${targetEvmChainId}`,
					);
				await walletConnectAppKit.switchNetwork(network, {
					throwOnFailure: true,
				});
				return;
			}

			await account.client.switchChain({ id: targetEvmChainId });
		} catch (switchError) {
			if (isUserRejection(switchError)) return;

			// WalletConnect can't switch from the dapp, or the injected wallet
			// reported the switch method as unsupported: ask the user to switch
			// manually rather than surfacing a raw RPC error.
			if (walletConnectAppKit || isUnsupportedSwitch(switchError)) {
				notifyError(
					new Error(
						`Couldn't switch your wallet to ${
							chain?.name ?? "the target network"
						}. Please switch network manually in your wallet, then try again.`,
					),
				);
				return;
			}

			// Injected wallet: chain not recognized — try adding it first.
			try {
				await account.client.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: `0x${targetEvmChainId.toString(16)}`,
							chainName: chain?.name ?? `Chain ${targetEvmChainId}`,
							rpcUrls: chain?.evmRpcUrl ?? [],
							blockExplorerUrls: chain?.evmBlockExplorers ?? [],
							nativeCurrency: {
								name: nativeToken?.symbol ?? "Native Token",
								symbol: nativeToken?.symbol ?? "UNIT",
								decimals: 18, // always 18 on ethereum
							},
						},
					],
				});

				await account.client.switchChain({ id: targetEvmChainId });
			} catch (error) {
				notifyError(error);
			}
		} finally {
			setIsSwitchingEthereumNetwork(false);
		}
	}, [
		account,
		walletConnectAppKit,
		chain?.evmBlockExplorers,
		chain?.evmRpcUrl,
		chain?.name,
		isEthereumAccount,
		nativeToken?.symbol,
		targetEvmChainId,
	]);

	return {
		account,
		chain,
		isEthereumAccount,
		nativeToken,
		isEthereumNetworkMismatch,
		targetEvmChainId,
		connectedEvmChainId,
		onSwitchEthereumNetwork,
		isSwitchingEthereumNetwork,
	};
};
