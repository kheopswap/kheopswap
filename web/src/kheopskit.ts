import type { KheopskitConfig } from "@kheopskit/core";
import { WALLET_CONNECT_PROJECT_ID } from "@kheopswap/constants";
import { defineChain } from "@reown/appkit/networks";

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

const kusamaAssetHub = defineChain({
	id: "48239ef607d7928874027a43a6768920",
	name: "Kusama Asset Hub",
	nativeCurrency: { name: "Kusama", symbol: "KSM", decimals: 12 },
	rpcUrls: {
		default: {
			http: ["https://kusama-asset-hub-rpc.polkadot.io"],
			webSocket: ["wss://kusama-asset-hub-rpc.polkadot.io"],
		},
	},
	chainNamespace: "polkadot",
	caipNetworkId: "polkadot:48239ef607d7928874027a43a6768920",
});

const westendAssetHub = defineChain({
	id: "67f9723393ef76214df0118c34bbbd3d",
	name: "Westend Asset Hub",
	nativeCurrency: { name: "Westend", symbol: "WND", decimals: 12 },
	rpcUrls: {
		default: {
			http: ["https://westend-asset-hub-rpc.polkadot.io"],
			webSocket: ["wss://westend-asset-hub-rpc.polkadot.io"],
		},
	},
	chainNamespace: "polkadot",
	caipNetworkId: "polkadot:67f9723393ef76214df0118c34bbbd3d",
});

const paseoAssetHub = defineChain({
	id: "d6eec26135305a8ad257a20d00335728",
	name: "Paseo Asset Hub",
	nativeCurrency: { name: "Paseo", symbol: "PAS", decimals: 10 },
	rpcUrls: {
		default: {
			http: ["https://sys.ibp.network/asset-hub-paseo"],
			webSocket: ["wss://sys.ibp.network/asset-hub-paseo"],
		},
	},
	chainNamespace: "polkadot",
	caipNetworkId: "polkadot:d6eec26135305a8ad257a20d00335728",
});

const polkadotAssetHubEvm = defineChain({
	id: "420420419",
	name: "Polkadot Asset Hub",
	nativeCurrency: { name: "Polkadot", symbol: "DOT", decimals: 18 },
	rpcUrls: {
		default: {
			http: ["https://asset-hub-eth-rpc.polkadot.io"],
		},
	},
	chainNamespace: "eip155",
	caipNetworkId: "eip155:420420419",
});

const kusamaAssetHubEvm = defineChain({
	id: "420420418",
	name: "Kusama Asset Hub",
	nativeCurrency: { name: "Kusama", symbol: "KSM", decimals: 18 },
	rpcUrls: {
		default: {
			http: ["https://kusama-asset-hub-eth-rpc.polkadot.io"],
		},
	},
	chainNamespace: "eip155",
	caipNetworkId: "eip155:420420418",
});

const westendAssetHubEvm = defineChain({
	id: "420420421",
	name: "Westend Asset Hub",
	nativeCurrency: { name: "Westend", symbol: "WND", decimals: 18 },
	rpcUrls: {
		default: {
			http: ["https://westend-asset-hub-eth-rpc.polkadot.io"],
		},
	},
	chainNamespace: "eip155",
	caipNetworkId: "eip155:420420421",
});

const paseoAssetHubEvm = defineChain({
	id: "420420417",
	name: "Paseo Asset Hub",
	nativeCurrency: { name: "Paseo", symbol: "PAS", decimals: 18 },
	rpcUrls: {
		default: {
			http: [
				"https://eth-rpc-testnet.polkadot.io",
				"https://services.polkadothub-rpc.com/testnet",
			],
		},
	},
	chainNamespace: "eip155",
	caipNetworkId: "eip155:420420417",
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
};
