import WalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
import { fromPairs } from "lodash";
import { type FC, useCallback, useMemo, useState } from "react";

import { Drawer } from "./Drawer";
import { DrawerContainer } from "./DrawerContainer";
import { InjectedAccountIcon } from "./InjectedAccountIcon";
import { Shimmer } from "./Shimmer";
import { Tokens } from "./Tokens";
import { ActionRightIcon } from "./icons";
import { Styles } from "./styles";

import type { Token } from "src/config/tokens";
import {
	type InjectedAccount,
	useBalancesWithStables,
	useInjectedExtension,
	useRelayChains,
	useToken,
	useWallets,
} from "src/hooks";
import type { BalanceWithStableSummary } from "src/types";
import { cn, isBigInt, isValidAddress, shortenAddress } from "src/util";

const ExtensionButton: FC<{
	name: string;
	isConnected: boolean;
	onClick: () => void;
}> = ({ name, isConnected, onClick }) => {
	const { extension, Icon } = useInjectedExtension(name);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center justify-between gap-3 rounded-md border p-2 px-4 text-left",
				isConnected
					? "border-green-700 hover:bg-green-500/10"
					: "hover:bg-white/10",
			)}
		>
			<div className="size-8 shrink-0">
				{Icon ? (
					<Icon className="size-5" />
				) : (
					<WalletIcon className="stroke-current" />
				)}
			</div>
			<div className="grow text-left">{extension?.title ?? name}</div>
			<div
				className={cn(
					"size-2 rounded-full",
					isConnected ? "bg-success-500" : "bg-error-500",
				)}
			/>
		</button>
	);
};

const AccountButton: FC<{
	account: InjectedAccount;
	selected?: boolean;
	disabled?: boolean;
	balance?: BalanceWithStableSummary;
	token?: Token | null;
	stableToken?: Token;
	onClick: () => void;
}> = ({
	account,
	selected,
	balance,
	token,
	stableToken,
	disabled,
	onClick,
}) => {
	const { Icon } = useInjectedExtension(account.wallet);

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				Styles.button,
				"flex w-full items-center gap-4   overflow-hidden p-2 pl-4  pr-3 ",
				selected && "ring-1 ring-neutral-500",
				"disabled:border-transparent disabled:opacity-100",
			)}
		>
			<InjectedAccountIcon account={account} className="size-8" />
			<div className="flex grow flex-col items-start justify-center overflow-hidden">
				<div className="flex w-full items-center gap-2 overflow-hidden text-neutral-300">
					<div className="truncate">{account.name}</div>
					<div className="inline-block size-4 shrink-0">
						{Icon ? <Icon /> : <WalletIcon className="size-4 stroke-current" />}
					</div>
				</div>
				<div className="truncate text-xs text-neutral-500">
					{shortenAddress(account.address)}
				</div>
			</div>
			{balance && token && stableToken ? (
				balance.isInitializing ? (
					<div className="flex h-full flex-col items-end justify-center gap-0.5">
						<Shimmer className="h-5 overflow-hidden">0.0001 TKN</Shimmer>
						<Shimmer className="h-4 overflow-hidden text-sm">0.00 USDC</Shimmer>
					</div>
				) : (
					<div className="flex h-full flex-col items-end justify-center">
						<div className="text-neutral-50">
							<Tokens
								token={token}
								plancks={balance.tokenPlancks ?? 0n}
								className={cn(balance.isLoadingTokenPlancks && "animate-pulse")}
							/>
						</div>
						<div className="text-sm text-neutral-500">
							<Tokens
								token={stableToken}
								plancks={balance.stablePlancks ?? 0n}
								className={cn(
									balance.isLoadingStablePlancks && "animate-pulse",
								)}
							/>
						</div>
					</div>
				)
			) : (
				!disabled && (
					<ActionRightIcon className="size-5 shrink-0 fill-current" />
				)
			)}
		</button>
	);
};

const AddressInput: FC<{
	address: string;
	onChange: (address: string) => void;
}> = ({ address, onChange }) => {
	const [localAddress, setLocalAddress] = useState(address);

	const isValid = useMemo(() => isValidAddress(localAddress), [localAddress]);

	const handleClick = useCallback(() => {
		onChange(localAddress);
	}, [localAddress, onChange]);

	return (
		<div
			className={cn(
				"flex h-[42px] w-full items-center rounded-sm border border-neutral-500 bg-neutral-900 outline-1 focus-within:outline",
				localAddress && !isValid
					? "border-error-500 outline-error-500"
					: "border-neutral-500 outline-neutral-500",
			)}
		>
			<input
				type="text"
				defaultValue={localAddress}
				onChange={(e) => setLocalAddress(e.target.value)}
				autoComplete="off"
				className="grow bg-transparent px-2 outline-none"
			/>
			<div
				className={cn(
					"h-full bg-neutral-600 p-1",

					localAddress
						? isValid
							? "hover:bg-neutral-500"
							: "bg-error-500 opacity-50"
						: "bg-neutral-800",
				)}
			>
				<button
					type="button"
					onClick={handleClick}
					disabled={!isValid}
					className="h-full px-2"
				>
					<ActionRightIcon className="size-5 shrink-0 fill-current" />
				</button>
			</div>
		</div>
	);
};

const AccountSelectDrawerContent: FC<{
	title?: string;
	idOrAddress?: string | null;
	ownedOnly?: boolean;
	tokenId?: string;
	onClose: () => void;
	onChange?: (accountIdOrAddress: string) => void;
}> = ({ title, idOrAddress, ownedOnly, tokenId, onClose, onChange }) => {
	const {
		accounts,
		connect,
		disconnect,
		connectedExtensions,
		injectedExtensionIds: injectedWallets,
	} = useWallets();

	const { stableToken } = useRelayChains();
	const { data: token } = useToken({ tokenId });
	const summaryInputs = useMemo(
		() => ({
			tokens: token ? [token] : [],
			accounts,
		}),
		[accounts, token],
	);
	const { data: balances, isLoading } = useBalancesWithStables(summaryInputs);

	const balanceByAccount = useMemo(() => {
		if (!balances) return {};
		return fromPairs(
			balances.map((b) => [
				b.address,
				{
					...b,
					isInitializing: !isBigInt(b.tokenPlancks) && isLoading,
				} as BalanceWithStableSummary,
			]),
		);
	}, [balances, isLoading]);

	const handleConnectWalletClick = useCallback(
		(wallet: string) => async () => {
			try {
				connectedExtensions.some((ext) => ext.name === wallet)
					? await disconnect(wallet)
					: await connect(wallet);
			} catch (err) {
				console.error("Failed to connect %s", wallet, { err });
			}
		},
		[connect, connectedExtensions, disconnect],
	);

	const address = useMemo(() => {
		return idOrAddress && isValidAddress(idOrAddress) ? idOrAddress : "";
	}, [idOrAddress]);

	const handleClick = useCallback(
		(id: string) => () => {
			onChange?.(id);
		},
		[onChange],
	);

	const sortedAccounts = useMemo(() => {
		return accounts.concat().sort((a1, a2) => {
			const [b1, b2] = [a1, a2].map((a) => balanceByAccount[a.address]);
			if (b1 && b2) {
				if (b1.stablePlancks === b2.stablePlancks) return 0;
				if (b1.stablePlancks === null) return 1;
				if (b2.stablePlancks === null) return -1;
				return b1.stablePlancks > b2.stablePlancks ? -1 : 1;
			}
			return 0;
		});
	}, [accounts, balanceByAccount]);

	return (
		<DrawerContainer
			title={title ?? (accounts.length ? "Select account" : "Connect wallet")}
			onClose={onClose}
		>
			{!ownedOnly && onChange && (
				<div>
					<h4 className="mb-1">Address</h4>
					<AddressInput address={address} onChange={onChange} />
				</div>
			)}
			<div>
				{!!injectedWallets?.length && (
					<>
						<h4 className="mb-1">Connected wallets</h4>
						<ul className="flex flex-col gap-2">
							{injectedWallets.map((wallet) => (
								<li key={wallet}>
									<ExtensionButton
										name={wallet}
										isConnected={connectedExtensions.some(
											(ext) => ext.name === wallet,
										)}
										onClick={handleConnectWalletClick(wallet)}
									/>
								</li>
							))}
						</ul>
					</>
				)}
				{!injectedWallets.length && (
					<div className="mb-1">No wallets found</div>
				)}
			</div>
			{!!accounts.length && (
				<div>
					<h4 className="mb-1">Connected Accounts</h4>
					<div className="flex flex-col gap-2">
						{sortedAccounts.map((account) => (
							<AccountButton
								key={account.id}
								account={account}
								selected={account.id === idOrAddress}
								balance={balanceByAccount[account.address]}
								token={token}
								stableToken={stableToken}
								onClick={handleClick(account.id)}
								disabled={!onChange}
							/>
						))}
					</div>
				</div>
			)}
		</DrawerContainer>
	);
};

export const AccountSelectDrawer: FC<{
	title?: string;
	isOpen: boolean;
	ownedOnly?: boolean;
	tokenId?: string;
	idOrAddress?: string | null | undefined;
	onDismiss: () => void;
	onChange?: (idOrAddress: string) => void;
}> = ({
	title,
	isOpen,
	idOrAddress,
	tokenId,
	ownedOnly,
	onChange,
	onDismiss,
}) => {
	return (
		<Drawer anchor="right" isOpen={isOpen} onDismiss={onDismiss}>
			<AccountSelectDrawerContent
				title={title}
				ownedOnly={ownedOnly}
				idOrAddress={idOrAddress}
				tokenId={tokenId}
				onClose={onDismiss}
				onChange={onChange}
			/>
		</Drawer>
	);
};
