import { Polkicon } from "@polkadot-ui/react";
import { TalismanOrb } from "@talismn/orb";
import type { FC } from "react";

import type { InjectedAccount } from "src/hooks";
import { cn } from "src/util";

export const InjectedAccountIcon: FC<{
	account: InjectedAccount;
	className?: string;
}> = ({ account, className }) => {
	return account.wallet === "talisman" ? (
		<TalismanOrb
			seed={account.address}
			className={cn("size-8 shrink-0 ", className)}
		/>
	) : (
		<Polkicon
			address={account.address}
			className={cn("size-8 rounded-full", className)}
		/>
	);
};
