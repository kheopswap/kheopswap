import type { WalletAccount } from "@kheopskit/core";

/**
 * Extracts the display name from a WalletAccount.
 * Polkadot accounts have a `name` property; Ethereum accounts do not.
 */
export const getAccountName = (
	account: WalletAccount | null | undefined,
): string | undefined => {
	if (!account) return undefined;
	return "name" in account ? (account.name as string) : undefined;
};
