import type { EngineTypes } from "@walletconnect/types";
import type { UniversalProviderOpts } from "@walletconnect/universal-provider";
import { WALLET_CONNECT_PROJECT_ID } from "src/config/constants";

export const WALLET_CONNECT_CHAINS = [
	"polkadot:91b171bb158e2d3848fa23a9f1c25182", // Polkadot
	"polkadot:68d56f15f85d3136970ec16946040bc1", // Polkadot asset hub

	"polkadot:b0a8d493285c2df73290dfb7e61f870f", // Kusama
	"polkadot:48239ef607d7928874027a43a6768920", // Kusama asset hub

	"polkadot:e143f23803ac50e8f6f8e62695d1ce9e", // Westend
	// "polkadot:67f9723393ef76214df0118c34bbbd3d", // Westend asset hub - breaks nova handshake
];

export const WALLET_CONNECT_PROVIDER_OPTS: UniversalProviderOpts = {
	projectId: WALLET_CONNECT_PROJECT_ID,
	metadata: {
		name: "Kheopswap",
		description: "Swaps on Polkadot Asset Hub",
		url: "https://kheopswap.xyz/",
		icons: ["https://avatars.githubusercontent.com/u/168302717?s=200&v=4"],
	},
	relayUrl: "wss://relay.walletconnect.com",
	client: undefined,
};

export const WALLET_CONNECT_CONNECT_PARAMS: EngineTypes.ConnectParams = {
	requiredNamespaces: {
		polkadot: {
			methods: ["polkadot_signTransaction", "polkadot_signMessage"],
			chains: WALLET_CONNECT_CHAINS,
			//events: ['chainChanged", "accountsChanged'],
			events: ["chainChanged", "accountsChanged"],
		},
	},
};

export const WALLET_CONNECT_NAME = "WALLETCONNECT";
