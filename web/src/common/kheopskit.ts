import {
	type AccountOf,
	isInjectedWallet,
	isWalletConnectWallet,
	type WalletConnectWallet,
	type WalletOf,
} from "@kheopskit/core";
import { ethereum } from "@kheopskit/core/ethereum";
import { polkadot } from "@kheopskit/core/polkadot";
import { createKheopskit } from "@kheopskit/react";
import { defineChain } from "@reown/appkit/networks";
import { getChainById } from "../registry/chains/chains";
import type { ChainId } from "../registry/chains/types";
import { WALLET_CONNECT_PROJECT_ID } from "./constants";

type SubstrateNetworkInput = {
	id: string;
	chainId: ChainId;
	name: string;
	symbol: string;
	decimals: number;
};

type EthereumNetworkInput = {
	id: string;
	name: string;
	symbol: string;
	http: string[];
	decimals?: number;
};

const defineSubstrateNetwork = ({
	id,
	chainId,
	name,
	symbol,
	decimals,
}: SubstrateNetworkInput) => {
	const webSocket = getChainById(chainId).wsUrl;
	const http = webSocket.map((url) => url.replace(/^wss:/, "https:"));

	return defineChain({
		id,
		name,
		nativeCurrency: { name, symbol, decimals },
		rpcUrls: {
			default: {
				http,
				webSocket,
			},
		},
		chainNamespace: "polkadot",
		caipNetworkId: `polkadot:${id}`,
	});
};

const defineEthereumNetwork = ({
	id,
	name,
	symbol,
	http,
	decimals = 18,
}: EthereumNetworkInput) =>
	defineChain({
		id,
		name,
		nativeCurrency: { name, symbol, decimals },
		rpcUrls: {
			default: {
				http,
			},
		},
		chainNamespace: "eip155",
		caipNetworkId: `eip155:${id}`,
	});

const polkadotAssetHub = defineSubstrateNetwork({
	id: "68d56f15f85d3136970ec16946040bc1",
	chainId: "pah",
	name: "Polkadot Asset Hub",
	symbol: "DOT",
	decimals: 10,
});

const kusamaAssetHub = defineSubstrateNetwork({
	id: "48239ef607d7928874027a43a6768920",
	chainId: "kah",
	name: "Kusama Asset Hub",
	symbol: "KSM",
	decimals: 12,
});

const westendAssetHub = defineSubstrateNetwork({
	id: "67f9723393ef76214df0118c34bbbd3d",
	chainId: "wah",
	name: "Westend Asset Hub",
	symbol: "WND",
	decimals: 12,
});

const paseoAssetHub = defineSubstrateNetwork({
	id: "d6eec26135305a8ad257a20d00335728",
	chainId: "pasah",
	name: "Paseo Asset Hub",
	symbol: "PAS",
	decimals: 10,
});

const polkadotAssetHubEvm = defineEthereumNetwork({
	id: "420420419",
	name: "Polkadot Asset Hub",
	symbol: "DOT",
	http: [
		"https://eth-rpc.polkadot.io",
		// "https://services.polkadothub-rpc.com/mainnet", # buggy, returns null on getTransactionByHash for transactions that exist
	],
});

const kusamaAssetHubEvm = defineEthereumNetwork({
	id: "420420418",
	name: "Kusama Asset Hub",
	symbol: "KSM",
	http: ["https://kusama-asset-hub-eth-rpc.polkadot.io"],
});

const westendAssetHubEvm = defineEthereumNetwork({
	id: "420420421",
	name: "Westend Asset Hub",
	symbol: "WND",
	http: ["https://westend-asset-hub-eth-rpc.polkadot.io"],
});

const paseoAssetHubEvm = defineEthereumNetwork({
	id: "420420417",
	name: "Paseo Asset Hub",
	symbol: "PAS",
	http: ["https://eth-rpc-testnet.polkadot.io"],
});

const evmNetworks = [
	polkadotAssetHubEvm,
	kusamaAssetHubEvm,
	westendAssetHubEvm,
	paseoAssetHubEvm,
];

/**
 * AppKit network object for a given EVM chain id. Used to switch the active
 * network of a WalletConnect session — WC wallets don't support the injected
 * `wallet_switchEthereumChain` / `wallet_addEthereumChain` RPC methods, so the
 * switch has to go through AppKit's `switchNetwork`.
 */
export const getEvmAppKitNetwork = (evmChainId: number) =>
	evmNetworks.find((network) => Number(network.id) === evmChainId);

const platforms = [polkadot(), ethereum()] as const;

export const { KheopskitProvider, useWallets } = createKheopskit({
	platforms,
	autoReconnect: true,
	walletConnect: WALLET_CONNECT_PROJECT_ID
		? {
				projectId: WALLET_CONNECT_PROJECT_ID,
				metadata: {
					name: "Kheopswap",
					description: "Decentralized Exchange for Polkadot Asset Hub",
					url: window.location.origin,
					icons: [`${window.location.origin}/img/tokens/KHEOPS.svg`],
				},
				networks: [
					polkadotAssetHub,
					kusamaAssetHub,
					westendAssetHub,
					paseoAssetHub,
					polkadotAssetHubEvm,
					kusamaAssetHubEvm,
					westendAssetHubEvm,
					paseoAssetHubEvm,
				],
			}
		: undefined,
	debug: false,
});

/** Account union precise to the configured platforms (polkadot + ethereum). */
export type WalletAccount = AccountOf<(typeof platforms)[number]>;
/**
 * Wallet union precise to the configured platforms: each platform's injected
 * wallets plus the single, platform-less WalletConnect connector.
 */
export type Wallet = WalletOf<(typeof platforms)[number]> | WalletConnectWallet;
export type { PolkadotAccount } from "@kheopskit/core/polkadot";

export { isInjectedWallet, isWalletConnectWallet };
