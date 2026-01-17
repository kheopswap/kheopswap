import { cn } from "@kheopswap/utils";
import { Polkicon } from "@polkadot-ui/react";
import { TalismanOrb } from "@talismn/orb";
import type { FC } from "react";
import type { PolkadotAccount } from "src/hooks";

export const InjectedAccountIcon: FC<{
	account: PolkadotAccount;
	className?: string;
}> = ({ account, className }) => {
	return account.walletId.includes("talisman") ? (
		<TalismanOrb
			seed={account.address}
			className={cn("size-8 shrink-0", className)}
		/>
	) : (
		<Polkicon
			address={account.address}
			className={cn("size-8 rounded-full", className)}
		/>
	);
};
