import { useWallets as useKheopskitWallets } from "@kheopskit/react";
import { useCallback, useMemo } from "react";

export const useWallets = () => {
	const { wallets, accounts } = useKheopskitWallets();

	// Filter to only polkadot wallets (this app doesn't use Ethereum)
	const polkadotWallets = useMemo(
		() => wallets.filter((w) => w.platform === "polkadot"),
		[wallets],
	);

	// Filter to only polkadot accounts
	const polkadotAccounts = useMemo(
		() => accounts.filter((a) => a.platform === "polkadot"),
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
