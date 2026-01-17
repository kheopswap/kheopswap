import type { PolkadotAccount, Wallet } from "@kheopskit/core";
import { useWallets as useKheopskitWallets } from "@kheopskit/react";
import { useCallback, useMemo } from "react";

export type InjectedAccount = PolkadotAccount & {
	wallet: string;
	walletIcon: string;
};

export const useWallets = () => {
	const { wallets, accounts } = useKheopskitWallets();

	// Filter to only polkadot wallets (this app doesn't use Ethereum)
	const polkadotWallets = useMemo(
		() =>
			wallets.filter(
				(w): w is Wallet & { platform: "polkadot" } =>
					w.platform === "polkadot",
			),
		[wallets],
	);

	// Map kheopskit accounts to the format expected by the app
	const mappedAccounts = useMemo(() => {
		return accounts
			.filter((a): a is PolkadotAccount => a.platform === "polkadot")
			.map((account) => ({
				...account,
				// Extract wallet name from walletId (e.g., "polkadot:talisman" -> "talisman")
				wallet: account.walletId.split(":")[1] ?? account.walletName,
				walletIcon:
					polkadotWallets.find((w) => w.id === account.walletId)?.icon ?? "",
			})) as InjectedAccount[];
	}, [accounts, polkadotWallets]);

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
		accounts: mappedAccounts,
		connect,
		disconnect,
	};
};
