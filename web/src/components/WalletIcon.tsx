import { useWallets } from "@kheopskit/react";
import { cn } from "@kheopswap/utils";
import GenericWalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
import { type FC, useMemo } from "react";

export const WalletIcon: FC<{
	walletId: string | null | undefined;
	className?: string;
}> = ({ walletId, className }) => {
	const { wallets } = useWallets();

	const icon = useMemo(
		() => wallets.find((w) => w.id === walletId)?.icon,
		[wallets, walletId],
	);

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
