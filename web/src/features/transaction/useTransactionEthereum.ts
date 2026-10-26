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

const EIP1193_USER_REJECTED_REQUEST = 4001;
const EIP1193_UNSUPPORTED_METHOD = 4200;
const JSON_RPC_METHOD_NOT_FOUND = -32601;

const isUserRejection = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code: unknown }).code === EIP1193_USER_REJECTED_REQUEST;

const isUnsupportedSwitch = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null) return false;
	const code = "code" in error ? (error as { code: unknown }).code : undefined;
	if (code === JSON_RPC_METHOD_NOT_FOUND || code === EIP1193_UNSUPPORTED_METHOD)
		return true;
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

	const walletConnectAppKit = useMemo(() => {
		if (!account) return null;
		const wallet = wallets.find((w) => w.id === account.walletId);
		return wallet && isWalletConnectWallet(wallet) && !wallet.isPlaceholder
			? (wallet.appKit as AppKit)
			: null;
	}, [wallets, account]);

	const isEthereumNetworkMismatch = useMemo(() => {
		if (!isEthereumAccount || !targetEvmChainId) return false;
		return targetEvmChainId !== connectedEvmChainId;
	}, [connectedEvmChainId, isEthereumAccount, targetEvmChainId]);

	const onSwitchEthereumNetwork = useCallback(async () => {
		if (
			account?.platform !== "ethereum" ||
			account.isPlaceholder ||
			!targetEvmChainId
		)
			return;

		try {
			setIsSwitchingEthereumNetwork(true);

			// WalletConnect sessions lack wallet_switchEthereumChain and wallet_addEthereumChain
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
								decimals: 18,
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
