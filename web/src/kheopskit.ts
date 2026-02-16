import type { KheopskitConfig } from "@kheopskit/core";
import { WALLET_CONNECT_PROJECT_ID } from "@kheopswap/constants";
import { defineChain } from "@reown/appkit/networks";

// Define Polkadot networks for WalletConnect using defineChain
const polkadot = defineChain({
	id: "91b171bb158e2d3848fa23a9f1c25182",
	name: "Polkadot",
	nativeCurrency: { name: "Polkadot", symbol: "DOT", decimals: 10 },
	rpcUrls: {
		default: {
			http: ["https://rpc.ibp.network/polkadot"],
			webSocket: ["wss://rpc.ibp.network/polkadot"],
		},
	},
	chainNamespace: "polkadot",
	caipNetworkId: "polkadot:91b171bb158e2d3848fa23a9f1c25182",
});

const polkadotAssetHub = defineChain({
	id: "68d56f15f85d3136970ec16946040bc1",
	name: "Polkadot Asset Hub",
	nativeCurrency: { name: "Polkadot", symbol: "DOT", decimals: 10 },
	rpcUrls: {
		default: {
			http: ["https://polkadot-asset-hub-rpc.polkadot.io"],
			webSocket: ["wss://polkadot-asset-hub-rpc.polkadot.io"],
		},
	},
	chainNamespace: "polkadot",
	caipNetworkId: "polkadot:68d56f15f85d3136970ec16946040bc1",
});

const ethereum = defineChain({
	id: "1",
	name: "Ethereum",
	nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
	rpcUrls: {
		default: {
			http: ["https://eth.llamarpc.com"],
			webSocket: ["wss://ethereum-rpc.publicnode.com"],
		},
	},
	chainNamespace: "eip155",
	caipNetworkId: "eip155:1",
});

export const kheopskitConfig: Partial<KheopskitConfig> = {
	platforms: ["polkadot", "ethereum"],
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
				networks: [ethereum, polkadot, polkadotAssetHub],
			}
		: undefined,
	debug: false,
};
