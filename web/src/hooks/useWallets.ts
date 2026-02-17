import { useWallets as useKheopskitWallets } from "@kheopskit/react";
import { useCallback, useMemo } from "react";

export const useAllWallets = () => {
	const { wallets, accounts } = useKheopskitWallets();

	const connect = useCallback(
		async (walletId: string) => {
			const wallet = wallets.find((w) => w.id === walletId);
			if (wallet) {
				await wallet.connect();
			}
		},
		[wallets],
	);

	const disconnect = useCallback(
		(walletId: string) => {
			const wallet = wallets.find((w) => w.id === walletId);
			if (wallet) {
				wallet.disconnect();
			}
		},
		[wallets],
	);

	return {
		wallets,
		accounts,
		connect,
		disconnect,
	};
};

/**
 * Returns only Polkadot-platform wallets and accounts.
 */
export const useWallets = () => {
	const { wallets, accounts, connect, disconnect } = useAllWallets();

	const polkadotWallets = useMemo(
		() => wallets.filter((wallet) => wallet.platform === "polkadot"),
		[wallets],
	);

	const polkadotAccounts = useMemo(
		() => accounts.filter((account) => account.platform === "polkadot"),
		[accounts],
	);

	return {
		wallets: polkadotWallets,
		accounts: polkadotAccounts,
		connect,
		disconnect,
	};
};
