import GenericWalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
import type { FC } from "react";
import { useWallet } from "../common/kheopskit";
import { cn } from "../utils/cn";

export const WalletIcon: FC<{
	walletId: string;
	className?: string;
}> = ({ walletId, className }) => {
	const icon = useWallet(walletId)?.icon;

	if (icon) {
		return (
			<img
				src={icon}
				alt=""
				className={cn("shrink-0 object-contain", className)}
			/>
		);
	}

	return (
		<GenericWalletIcon className={cn("shrink-0 stroke-current", className)} />
	);
};
