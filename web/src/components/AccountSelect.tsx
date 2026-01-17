import type { TokenId } from "@kheopswap/registry";
import {
	cn,
	getAddressFromAccountField,
	isValidAddress,
} from "@kheopswap/utils";
import { Polkicon } from "@polkadot-ui/react";
import { type FC, useCallback, useMemo } from "react";
import { type PolkadotAccount, useOpenClose, useWallets } from "src/hooks";
import { AccountSelectDrawer } from "./AccountSelectDrawer";
import { InjectedAccountIcon } from "./InjectedAccountIcon";
import { ActionRightIcon } from "./icons";
import { Styles } from "./styles";
import { WalletIcon } from "./WalletIcon";

const AddressRow: FC<{ address: string; className?: string }> = ({
	address,
	className,
}) => {
	return (
		<div
			className={cn(
				"flex grow items-center gap-2 overflow-hidden text-left",
				className,
			)}
		>
			<Polkicon
				address={address}
				className={cn("size-6 rounded-full", className)}
			/>
			<div className="flex grow items-center overflow-hidden">
				<span className="truncate">{address}</span>
			</div>
		</div>
	);
};

const AccountRow: FC<{ account: PolkadotAccount; className?: string }> = ({
	account,
	className,
}) => {
	const { getWalletIcon } = useWallets();
	return (
		<div
			className={cn(
				"flex grow items-center gap-2 overflow-hidden text-left",
				className,
			)}
		>
			<InjectedAccountIcon className="size-6" account={account} />
			<div className="flex grow items-center overflow-hidden">
				<span className="truncate">{account.name}</span>
				<span className="ml-[0.5em] inline-block size-[1em] shrink-0">
					<WalletIcon
						icon={getWalletIcon(account.walletId)}
						className="size-4"
					/>
				</span>
			</div>
		</div>
	);
};

const AccountSelectButton: FC<{
	id?: string;
	idOrAddress?: string | null;
	className?: string;
	ownedOnly?: boolean;
	onClick?: () => void;
}> = ({ id, idOrAddress, className, ownedOnly, onClick }) => {
	const { accounts } = useWallets();
	const account = useMemo(
		() => accounts.find((a) => a.id === idOrAddress),
		[accounts, idOrAddress],
	);

	// Check if idOrAddress is a raw address (not an account ID)
	const isRawAddress = useMemo(
		() => idOrAddress && isValidAddress(idOrAddress),
		[idOrAddress],
	);

	// For raw addresses, extract for display. For account IDs, only show when account is resolved.
	const displayAddress = useMemo(
		() => (isRawAddress ? getAddressFromAccountField(idOrAddress) : null),
		[idOrAddress, isRawAddress],
	);

	const requiresConnect = useMemo(() => {
		return ownedOnly && !accounts.length;
	}, [accounts.length, ownedOnly]);

	return (
		<button
			id={id}
			type="button"
			onClick={onClick}
			className={cn(
				Styles.button,
				Styles.field,
				"enabled:hover:bg-neutral-900/50",
				"flex w-full justify-between gap-4 overflow-hidden p-2  pl-3",
				account || displayAddress
					? "text-neutral-300 hover:text-neutral-200"
					: " text-neutral-500 hover:text-neutral-400",
				className,
			)}
		>
			{requiresConnect ? (
				<div>Connect Wallet</div>
			) : account ? (
				<AccountRow account={account} className="grow overflow-hidden" />
			) : displayAddress ? (
				<AddressRow address={displayAddress} className="grow overflow-hidden" />
			) : (
				<div>Select Account</div>
			)}
			<ActionRightIcon className="inline-block size-6 shrink-0  fill-current" />
		</button>
	);
};

export const AccountSelect: FC<{
	id?: string;
	idOrAddress: string | null | undefined;
	tokenId?: TokenId;
	ownedOnly?: boolean;
	className?: string;
	onChange: (idOrAddress: string) => void;
}> = ({ id, ownedOnly, idOrAddress, tokenId, className, onChange }) => {
	const { isOpen, open, close } = useOpenClose();

	const handleChange = useCallback(
		(accountIdOrAddress: string) => {
			onChange(accountIdOrAddress);
			close();
		},
		[close, onChange],
	);

	return (
		<>
			<AccountSelectButton
				id={id}
				ownedOnly={ownedOnly}
				idOrAddress={idOrAddress}
				className={className}
				onClick={open}
			/>
			<AccountSelectDrawer
				isOpen={isOpen}
				ownedOnly={ownedOnly}
				idOrAddress={idOrAddress}
				tokenId={tokenId}
				onChange={handleChange}
				onDismiss={close}
			/>
		</>
	);
};
AccountSelect.displayName = "AccountSelect";
