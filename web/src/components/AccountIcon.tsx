import type { WalletAccount } from "@kheopskit/core";
import { TalismanOrb } from "@talismn/orb";
import type { FC } from "react";
import { isHex } from "viem";
import { cn } from "../utils/cn";
import { EthereumIdenticon } from "./EthereumIdenticon";
import { PolkadotIdenticon } from "./PolkadotIdenticon";

export const AccountIcon: FC<{
	account: WalletAccount;
	className?: string;
}> = ({ account, className }) => {
	if (account.walletId.includes("talisman")) {
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
