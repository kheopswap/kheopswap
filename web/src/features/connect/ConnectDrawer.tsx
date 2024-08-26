// import WalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
// import { type FC, useCallback } from "react";

// import { useConnectDrawer } from "./context";

// import { Drawer, DrawerContainer, InjectedAccountIcon } from "src/components";
// import {
// 	type InjectedAccount,
// 	useInjectedExtension,
// 	useWallets,
// } from "src/hooks";
// import { cn } from "src/util";
// import { connectWalletConnectClient } from "./walletConnect";

// const ExtensionButton: FC<{
// 	name: string;
// 	isConnected: boolean;
// 	onClick: () => void;
// }> = ({ name, isConnected, onClick }) => {
// 	const { extension, Icon } = useInjectedExtension(name);

// 	return (
// 		<button
// 			type="button"
// 			onClick={onClick}
// 			className={cn(
// 				"flex w-full items-center justify-between gap-3 rounded-md border p-2 px-4 text-left",
// 				isConnected
// 					? "border-green-700 hover:bg-green-500/10"
// 					: "hover:bg-white/10",
// 			)}
// 		>
// 			<div className="flex size-8 shrink-0 items-center">
// 				{Icon ? (
// 					<Icon className="size-5" />
// 				) : (
// 					<WalletIcon className="stroke-current" />
// 				)}
// 			</div>
// 			<div className="grow truncate text-left">{extension?.title ?? name}</div>
// 			<div
// 				className={cn(
// 					"size-2 rounded-full",
// 					isConnected ? "bg-success-500" : "bg-error-500",
// 				)}
// 			/>
// 		</button>
// 	);
// };

// const AccountRow: FC<{
// 	account: InjectedAccount;
// }> = ({ account }) => {
// 	const { Icon } = useInjectedExtension(account.wallet);

// 	return (
// 		<div className="flex w-full items-center gap-4 overflow-hidden rounded-md bg-neutral-800 p-2 px-4">
// 			<InjectedAccountIcon account={account} className="size-8" />
// 			<div className="flex grow flex-col justify-center overflow-hidden">
// 				<div className="flex items-center gap-2">
// 					<div className="truncate">{account.name}</div>
// 					<div className="inline-block size-4 shrink-0">
// 						{Icon ? <Icon /> : <WalletIcon className="size-4 stroke-current" />}
// 					</div>
// 				</div>
// 				<div className="truncate text-xs text-neutral-400">
// 					{account.address}
// 				</div>
// 			</div>
// 		</div>
// 	);
// };

// const ConnectDrawerContent: FC<{ onClose: () => void }> = ({ onClose }) => {
// 	const {
// 		connect,
// 		disconnect,
// 		accounts,
// 		connectedExtensions,
// 		injectedExtensionIds: injectedWallets,
// 	} = useWallets();

// 	const handleConnectWalletClick = useCallback(
// 		(wallet: string) => async () => {
// 			try {
// 				connectedExtensions.some((ext) => ext.name === wallet)
// 					? await disconnect(wallet)
// 					: await connect(wallet);
// 			} catch (err) {
// 				console.error("Failed to connect %s", wallet, { err });
// 			}
// 		},
// 		[connect, connectedExtensions, disconnect],
// 	);

// 	const handleWalletConnectClick = useCallback(async () => {
// 		console.log("Wallet Connect");
// 		try {
// 			const accounts = await connectWalletConnectClient();
// 			console.log("Wallet Connect", { accounts });
// 		} catch (err) {
// 			console.error("Failed to connect Wallet Connect", { err });
// 		}
// 	}, []);

// 	return (
// 		<DrawerContainer title="Connect" onClose={onClose}>
// 			<div>
// 				<h4>Connected wallets</h4>
// 				{!!injectedWallets?.length && (
// 					<ul className="mt-2 flex flex-col gap-2">
// 						{injectedWallets.map((wallet) => (
// 							<li key={wallet}>
// 								<ExtensionButton
// 									name={wallet}
// 									isConnected={connectedExtensions.some(
// 										(ext) => ext.name === wallet,
// 									)}
// 									onClick={handleConnectWalletClick(wallet)}
// 								/>
// 							</li>
// 						))}
// 					</ul>
// 				)}
// 				{!injectedWallets.length && <div>No wallets found</div>}
// 			</div>
// 			<div>
// 				<h4>External wallets</h4>
// 				<ul className="mt-2 flex flex-col gap-2">
// 					<li>
// 						<ExtensionButton
// 							name={"Wallet Connect"}
// 							isConnected={false}
// 							onClick={handleWalletConnectClick}
// 						/>
// 					</li>
// 				</ul>
// 			</div>
// 			{!!accounts.length && (
// 				<div className="my-2">
// 					<div>Connected accounts</div>
// 					<ul className="my-2 flex flex-col gap-2">
// 						{accounts.map((account) => (
// 							<li key={`${account.wallet}-${account.address}`}>
// 								<AccountRow account={account} />
// 							</li>
// 						))}
// 					</ul>
// 				</div>
// 			)}
// 		</DrawerContainer>
// 	);
// };

// export const ConnectDrawer = () => {
// 	const { isOpen, close } = useConnectDrawer();

// 	return (
// 		<Drawer anchor="right" isOpen={isOpen} onDismiss={close}>
// 			<ConnectDrawerContent onClose={close} />
// 		</Drawer>
// 	);
// };
