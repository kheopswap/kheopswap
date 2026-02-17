import type { KheopskitConfig } from "@kheopskit/core";
import { WALLET_CONNECT_PROJECT_ID } from "@kheopswap/constants";
import { defineChain } from "@reown/appkit/networks";

type SubstrateNetworkInput = {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
	http: string[];
	webSocket: string[];
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
	name,
	symbol,
	decimals,
	http,
	webSocket,
}: SubstrateNetworkInput) =>
	defineChain({
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
	name: "Polkadot Asset Hub",
	symbol: "DOT",
	decimals: 10,
	http: ["https://polkadot-asset-hub-rpc.polkadot.io"],
	webSocket: ["wss://polkadot-asset-hub-rpc.polkadot.io"],
});

const kusamaAssetHub = defineSubstrateNetwork({
	id: "48239ef607d7928874027a43a6768920",
	name: "Kusama Asset Hub",
	symbol: "KSM",
	decimals: 12,
	http: ["https://kusama-asset-hub-rpc.polkadot.io"],
	webSocket: ["wss://kusama-asset-hub-rpc.polkadot.io"],
});

const westendAssetHub = defineSubstrateNetwork({
	id: "67f9723393ef76214df0118c34bbbd3d",
	name: "Westend Asset Hub",
	symbol: "WND",
	decimals: 12,
	http: ["https://westend-asset-hub-rpc.polkadot.io"],
	webSocket: ["wss://westend-asset-hub-rpc.polkadot.io"],
});

const paseoAssetHub = defineSubstrateNetwork({
	id: "d6eec26135305a8ad257a20d00335728",
	name: "Paseo Asset Hub",
	symbol: "PAS",
	decimals: 10,
	http: ["https://sys.ibp.network/asset-hub-paseo"],
	webSocket: ["wss://sys.ibp.network/asset-hub-paseo"],
});

const polkadotAssetHubEvm = defineEthereumNetwork({
	id: "420420419",
	name: "Polkadot Asset Hub",
	symbol: "DOT",
	http: ["https://asset-hub-eth-rpc.polkadot.io"],
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
	http: [
		"https://eth-rpc-testnet.polkadot.io",
		"https://services.polkadothub-rpc.com/testnet",
	],
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
