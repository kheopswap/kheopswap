import type { Wallet, WalletAccount } from "@kheopskit/core";
import { useWallets } from "@kheopskit/react";
import { fromPairs } from "lodash-es";
import { type FC, useCallback, useMemo, useState } from "react";
import { useBalancesWithStables } from "../hooks/useBalancesWithStables";
import { useToken } from "../hooks/useToken";
import type { Token } from "../registry/tokens/types";
import { useRelayChains } from "../state/relay";
import type { BalanceWithStableSummary } from "../types/balances";
import { cn } from "../utils/cn";
import { isValidAnyAddress } from "../utils/ethereumAddress";
import { getAccountName } from "../utils/getAccountName";
import { isBigInt } from "../utils/isBigInt";
import { shortenAddress } from "../utils/shortenAddress";
import { AccountIcon } from "./AccountIcon";
import { Drawer } from "./Drawer";
import { DrawerContainer } from "./DrawerContainer";
import { ActionRightIcon } from "./icons";
import { Shimmer } from "./Shimmer";
import { Styles } from "./styles";
import { Tokens } from "./Tokens";
import { WalletIcon } from "./WalletIcon";

const getPlatformLabel = (platform: string) =>
	platform === "ethereum" ? "Ethereum" : "Polkadot";

const WalletButton: FC<{
	wallet: Wallet;
	onClick: () => void;
}> = ({ wallet, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			"flex w-full items-center justify-between gap-3 rounded-md border p-2 px-4 text-left",
			wallet.isConnected
				? "border-green-700 hover:bg-green-500/10"
				: "hover:bg-white/10",
		)}
	>
		<div className="size-8 shrink-0">
			<WalletIcon walletId={wallet.id} className="size-8" />
		</div>
		<div className="grow text-left">
			{wallet.name}
			<span className="ml-1 text-xs text-neutral-500">
				({getPlatformLabel(wallet.platform)})
			</span>
		</div>
		<div
			className={cn(
				"size-2 rounded-full",
				wallet.isConnected ? "bg-success-500" : "bg-error-500",
			)}
		/>
	</button>
);

const AccountButton: FC<{
	account: WalletAccount;
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
	const accountName = useMemo(() => getAccountName(account), [account]);

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
			<AccountIcon account={account} className="size-8" />
			<div className="flex grow flex-col items-start justify-center overflow-hidden">
				<div className="flex w-full items-center gap-2 overflow-hidden text-neutral-300">
					<div className="truncate">
						{accountName ?? shortenAddress(account.address)}
					</div>
					<div className="inline-block size-4 shrink-0">
						<WalletIcon walletId={account.walletId} className="size-4" />
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
								pulse={balance.isLoadingTokenPlancks}
							/>
						</div>
						<div className="text-sm text-neutral-500">
							<Tokens
								token={stableToken}
								plancks={balance.stablePlancks ?? 0n}
								pulse={balance.isLoadingStablePlancks}
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

	const isValid = useMemo(
		() => isValidAnyAddress(localAddress),
		[localAddress],
	);

	const handleClick = useCallback(() => {
		onChange(localAddress);
	}, [localAddress, onChange]);

	return (
		<div
			className={cn(
				"flex h-10.5 w-full items-center rounded-xs border border-neutral-500 bg-neutral-900 outline-1 focus-within:outline-solid",
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
				className="grow bg-transparent px-2 outline-hidden"
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
	const { accounts, wallets } = useWallets();

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

	const handleWalletClick = useCallback(
		(walletId: string, isConnected: boolean) => async () => {
			try {
				const wallet = wallets.find((w) => w.id === walletId);
				if (!wallet) return;
				if (isConnected) {
					wallet.disconnect();
				} else {
					await wallet.connect();
				}
			} catch (err) {
				console.error("Failed to toggle wallet connection %s", walletId, {
					err,
				});
			}
		},
		[wallets],
	);

	const address = useMemo(() => {
		return idOrAddress && isValidAnyAddress(idOrAddress) ? idOrAddress : "";
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
			if (b1 && !b2) return -1;
			if (!b1 && b2) return 1;
			if (b1 && b2) {
				if (b1.stablePlancks === b2.stablePlancks) return 0;
				if (b1.stablePlancks === null) return 1;
				if (b2.stablePlancks === null) return -1;
				return b1.stablePlancks > b2.stablePlancks ? -1 : 1;
			}
			return 0;
		});
	}, [accounts, balanceByAccount]);

	// Separate injected wallets from WalletConnect
	const injectedWallets = useMemo(
		() => wallets.filter((w) => w.type === "injected"),
		[wallets],
	);
	const walletConnectWallet = useMemo(
		() => wallets.find((w) => w.type === "appKit"),
		[wallets],
	);

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
				{!!injectedWallets.length && (
					<>
						<h4 className="mb-1">Installed wallets</h4>
						<ul className="flex flex-col gap-2">
							{injectedWallets.map((wallet) => (
								<li key={wallet.id}>
									<WalletButton
										wallet={wallet}
										onClick={handleWalletClick(wallet.id, wallet.isConnected)}
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
			{walletConnectWallet && (
				<div>
					<h4>External wallets</h4>
					<ul className="mt-2 flex flex-col gap-2">
						<li>
							<WalletButton
								wallet={walletConnectWallet}
								onClick={handleWalletClick(
									walletConnectWallet.id,
									walletConnectWallet.isConnected,
								)}
							/>
						</li>
					</ul>
				</div>
			)}
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
