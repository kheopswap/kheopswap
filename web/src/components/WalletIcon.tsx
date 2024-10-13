import type { FC } from "react";
import { useInjectedExtension } from "src/hooks";
import { WalletConnectIcon } from "./icons";

import { cn } from "@kheopswap/utils";
import GenericWalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
import { WALLET_CONNECT_NAME } from "src/features/connect/wallet-connect";

export const WalletIcon: FC<{ wallet: string; className?: string }> = ({
	wallet,
	className,
}) => {
	const { Icon } = useInjectedExtension(wallet);

	if (Icon) return <Icon className={cn("shrink-0", className)} />;

	if (wallet === WALLET_CONNECT_NAME)
		return <WalletConnectIcon className={cn("shrink-0", className)} />;

	return (
		<GenericWalletIcon className={cn("shrink-0 stroke-current", className)} />
	);
};
