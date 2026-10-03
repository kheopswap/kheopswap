import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { uniqBy } from "lodash-es";
import { useMemo } from "react";
import { useWallets } from "../common/kheopskit";
import { useOpenClose } from "../hooks/useOpenClose";
import { cn } from "../utils/cn";
import { AccountSelectDrawer } from "./AccountSelectDrawer";
import { Styles } from "./styles";
import { WalletIcon } from "./WalletIcon";

export const ConnectButton = () => {
	const { open, close, isOpen } = useOpenClose();
	const { wallets, accounts } = useWallets();

	const walletIcons = useMemo(
		() =>
			uniqBy(
				wallets.filter((wallet) => wallet.isConnected),
				(wallet) => wallet.icon,
			),
		[wallets],
	);

	const accountsLabel = `${accounts.length} account${accounts.length === 1 ? "" : "s"}`;

	return (
		<>
			<button
				type="button"
				onClick={open}
				aria-label={
					accounts.length
						? `Wallet: ${accounts.length} connected`
						: "Connect wallet"
				}
				className={Styles.headerButton}
			>
				{accounts.length ? (
					<>
						<span className="flex items-center">
							{walletIcons.map((wallet) => (
								<WalletIcon
									key={wallet.id}
									walletId={wallet.id}
									className="size-5 rounded-chip not-first:-ml-1.5"
								/>
							))}
						</span>
						<span className="hidden sm:inline">{accountsLabel}</span>
						<span className="min-w-4.5 rounded-full bg-primary px-1.5 text-center text-[11px] leading-4.5 font-semibold text-primary-ink sm:hidden">
							{accounts.length}
						</span>
					</>
				) : (
					"Connect"
				)}
				<ChevronDownIcon
					className={cn(
						"size-3.5 opacity-60",
						!!accounts.length && "max-sm:hidden",
					)}
				/>
			</button>
			<AccountSelectDrawer
				title={"Connect"}
				isOpen={isOpen}
				onDismiss={close}
				ownedOnly
			/>
		</>
	);
};
