import { useWallets as useKheopskitWallets } from "@kheopskit/react";
import { useCallback, useMemo } from "react";

export const useWallets = () => {
	const { wallets, accounts } = useKheopskitWallets();

	const polkadotWallets = useMemo(
		() => wallets.filter((wallet) => wallet.platform === "polkadot"),
		[wallets],
	);

	const polkadotAccounts = useMemo(
		() => accounts.filter((account) => account.platform === "polkadot"),
		[accounts],
	);

	const connect = useCallback(
		async (walletId: string) => {
			const wallet = polkadotWallets.find((w) => w.id === walletId);
			if (wallet) {
				await wallet.connect();
			}
		},
		[polkadotWallets],
	);

	const disconnect = useCallback(
		(walletId: string) => {
			const wallet = polkadotWallets.find((w) => w.id === walletId);
			if (wallet) {
				wallet.disconnect();
			}
		},
		[polkadotWallets],
	);

	return {
		wallets: polkadotWallets,
		accounts: polkadotAccounts,
		connect,
		disconnect,
	};
};

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
