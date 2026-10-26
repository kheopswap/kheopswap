import type { WalletAccount } from "../common/kheopskit";

export const getAccountName = (account: WalletAccount | null | undefined) =>
	account && "name" in account ? account.name : undefined;
