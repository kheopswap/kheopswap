import { cn } from "@kheopswap/utils";
import GenericWalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
import type { FC } from "react";

export const WalletIcon: FC<{
	walletId: string;
	icon?: string;
	className?: string;
}> = ({ icon, className }) => {
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
