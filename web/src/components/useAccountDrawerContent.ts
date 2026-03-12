import type { WalletAccount } from "@kheopskit/core";
import { useWallets } from "@kheopskit/react";
import { fromPairs } from "lodash-es";
import { useCallback, useMemo } from "react";
import { useBalancesWithStables } from "../hooks/useBalancesWithStables";
import { useToken } from "../hooks/useToken";
import { useRelayChains } from "../state/relay";
import type { BalanceWithStableSummary } from "../types/balances";
import { isValidAnyAddress } from "../utils/ethereumAddress";
import { isBigInt } from "../utils/isBigInt";

export const useAccountDrawerContent = ({
	tokenId,
	idOrAddress,
	onChange,
}: {
	tokenId?: string;
	idOrAddress?: string | null;
	onChange?: (accountIdOrAddress: string) => void;
}) => {
	const { accounts, wallets } = useWallets();

	const { stableToken } = useRelayChains();
	const { data: token } = useToken({ tokenId });
	const summaryInputs = useMemo(
		() => ({
			tokens: token ? [token] : [],
			accounts,
		}),
		[accounts, token],
	);
	const { data: balances, isLoading } = useBalancesWithStables(summaryInputs);

	const balanceByAccount = useMemo(() => {
		if (!balances) return {};
		return fromPairs(
			balances.map((b) => [
				b.address,
				{
					...b,
					isInitializing: !isBigInt(b.tokenPlancks) && isLoading,
				} as BalanceWithStableSummary,
			]),
		);
	}, [balances, isLoading]);

	const handleWalletClick = useCallback(
		(walletId: string, isConnected: boolean) => async () => {
			try {
				const wallet = wallets.find((w) => w.id === walletId);
				if (!wallet) return;
				if (isConnected) {
					wallet.disconnect();
				} else {
					await wallet.connect();
				}
			} catch (err) {
				console.error("Failed to toggle wallet connection %s", walletId, {
					err,
				});
			}
		},
		[wallets],
	);

	const address = useMemo(() => {
		return idOrAddress && isValidAnyAddress(idOrAddress) ? idOrAddress : "";
	}, [idOrAddress]);

	const handleAccountSelect = useCallback(
		(id: string) => {
			onChange?.(id);
		},
		[onChange],
	);

	const sortedAccounts = useMemo(() => {
		return accounts.concat().sort((a1: WalletAccount, a2: WalletAccount) => {
			const [b1, b2] = [a1, a2].map((a) => balanceByAccount[a.address]);
			if (b1 && !b2) return -1;
			if (!b1 && b2) return 1;
			if (b1 && b2) {
				if (b1.stablePlancks === b2.stablePlancks) return 0;
				if (b1.stablePlancks === null) return 1;
				if (b2.stablePlancks === null) return -1;
				return b1.stablePlancks > b2.stablePlancks ? -1 : 1;
			}
			return 0;
		});
	}, [accounts, balanceByAccount]);

	const injectedWallets = useMemo(
		() => wallets.filter((w) => w.type === "injected"),
		[wallets],
	);
	const walletConnectWallet = useMemo(
		() => wallets.find((w) => w.type === "appKit"),
		[wallets],
	);

	return {
		token,
		stableToken,
		accounts,
		sortedAccounts,
		balanceByAccount,
		injectedWallets,
		walletConnectWallet,
		address,
		handleWalletClick,
		handleAccountSelect,
	};
};
