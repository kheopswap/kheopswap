import { useCallback, useMemo, useState } from "react";
import { useNativeToken } from "../../hooks/useNativeToken";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import { getChainById } from "../../registry/chains/chains";
import type { ChainId } from "../../registry/chains/types";
import { notifyError } from "../../utils/notifyError";

type UseTransactionEthereumProps = {
	signer: string | null | undefined;
	chainId: ChainId | null | undefined;
};

export const useTransactionEthereum = ({
	signer,
	chainId,
}: UseTransactionEthereumProps) => {
	const account = useWalletAccount({ id: signer });
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

	const isEthereumNetworkMismatch = useMemo(() => {
		if (!isEthereumAccount) return false;
		if (!targetEvmChainId || !connectedEvmChainId) return false;
		return targetEvmChainId !== connectedEvmChainId;
	}, [connectedEvmChainId, isEthereumAccount, targetEvmChainId]);

	const onSwitchEthereumNetwork = useCallback(async () => {
		if (!isEthereumAccount || !targetEvmChainId) return;

		try {
			setIsSwitchingEthereumNetwork(true);
			await account.client.switchChain({ id: targetEvmChainId });
		} catch (switchError) {
			// EIP-1193 error code 4001 = user rejected the request
			if (
				typeof switchError === "object" &&
				switchError !== null &&
				"code" in switchError &&
				(switchError as { code: number }).code === 4001
			) {
				return;
			}

			// Chain not recognized — try adding it first
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
