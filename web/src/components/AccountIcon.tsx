import { TalismanOrb } from "@talismn/orb";
import type { FC } from "react";
import { isHex } from "viem";
import type { WalletAccount } from "../common/kheopskit";
import { cn } from "../utils/cn";
import { EthereumIdenticon } from "./EthereumIdenticon";
import { PolkadotIdenticon } from "./PolkadotIdenticon";

const isTalismanAccount = ({ walletId, walletName }: WalletAccount) =>
	[walletId, walletName].some((walletLabel) =>
		walletLabel.toLowerCase().includes("talisman"),
	);

export const AccountIcon: FC<{
	account: WalletAccount;
	className?: string;
}> = ({ account, className }) => {
	if (isTalismanAccount(account)) {
		return <TalismanOrb seed={account.address} className={className} />;
	}

	if (isHex(account.address)) {
		return (
			<EthereumIdenticon
				address={account.address}
				className={cn("size-full", className)}
			/>
		);
	}

	return (
		<PolkadotIdenticon
			address={account.address}
			className={cn("size-full", className)}
		/>
	);
};
