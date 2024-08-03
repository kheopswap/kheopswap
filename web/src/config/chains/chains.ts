import {
	devah,
	devrelay,
	kah,
	kusama,
	pah,
	polkadot,
	rah,
	rococo,
	wah,
	westend,
} from "@polkadot-api/descriptors";

import { DEV } from "src/config/constants";

const DESCRIPTORS_RELAY = {
	polkadot,
	kusama,
	rococo,
	westend,
	devrelay,
} as const;

const DESCRIPTORS_ASSET_HUB = {
	pah,
	kah,
	rah,
	wah,
	devah,
} as const;

export const DESCRIPTORS_ALL = {
	...DESCRIPTORS_RELAY,
	...DESCRIPTORS_ASSET_HUB,
} as const;

type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
type DescriptorsRelay = typeof DESCRIPTORS_RELAY;
export type DescriptorsAll = DescriptorsRelay & DescriptorsAssetHub;

export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainIdRelay = keyof DescriptorsRelay;
export type ChainId = ChainIdRelay | ChainIdAssetHub;

export const isChainIdAssetHub = (id: unknown): id is ChainIdAssetHub =>
	typeof id === "string" && !!DESCRIPTORS_ASSET_HUB[id as ChainIdAssetHub];
export const isChainIdRelay = (id: unknown): id is ChainIdRelay =>
	typeof id === "string" && !!DESCRIPTORS_RELAY[id as ChainIdRelay];

export type Descriptors<Id extends ChainId> = DescriptorsAll[Id];

export const getDescriptors = (id: ChainId): Descriptors<ChainId> =>
	DESCRIPTORS_ALL[id];

export type Chain<Id = ChainId> = {
	id: Id;
	name: string;
	wsUrl: string;
	relay: ChainIdRelay | null;
	paraId: number | null;
	logo: string;
	stableTokenId: string | null;
	blockExplorerUrl: string | null;
};

export type ChainRelay = Chain<ChainIdRelay> & { paraId: null };

export type ChainAssetHub = Chain<ChainIdAssetHub> & { paraId: 1000 };

const DEV_CHAINS: Chain[] = [
	{
		id: "devrelay",
		name: "Zombienet",
		wsUrl: "ws://127.0.0.1:42069",
		relay: "devrelay",
		paraId: null,
		logo: "./img/tokens/ROC.svg",
		stableTokenId: "native::devrelay",
		blockExplorerUrl: "https://perdu.com",
	},
	{
		id: "devah",
		name: "Zombienet Asset Hub",
		wsUrl: "ws://127.0.0.1:42070",
		relay: "devrelay",
		paraId: 1000,
		logo: "./img/chains/rah.svg",
		stableTokenId: "native::devah",
		blockExplorerUrl: "https://perdu.com",
	},
];

const PROD_CHAINS: Chain[] = [
	{
		id: "polkadot",
		name: "Polkadot",
		wsUrl: "wss://polkadot-rpc.dwellir.com",
		relay: "polkadot",
		paraId: null,
		logo: "./img/tokens/DOT.svg",
		stableTokenId: null,
		blockExplorerUrl: "https://polkadot.subscan.io",
	},
	{
		id: "pah",
		name: "Polkadot Asset Hub",
		wsUrl: "wss://statemint-rpc.dwellir.com",
		relay: "polkadot",
		paraId: 1000,
		logo: "./img/chains/pah.svg",
		stableTokenId: "asset::pah::1337",
		blockExplorerUrl: "https://assethub-polkadot.subscan.io",
	},
	{
		id: "kusama",
		name: "Kusama",
		wsUrl: "wss://kusama-rpc.polkadot.io",
		relay: "kusama",
		paraId: null,
		logo: "./img/tokens/KSM.svg",
		stableTokenId: null,
		blockExplorerUrl: "https://kusama.subscan.io",
	},
	{
		id: "kah",
		name: "Kusama Asset Hub",
		wsUrl: "wss://kusama-asset-hub-rpc.polkadot.io",
		relay: "kusama",
		paraId: 1000,
		logo: "./img/chains/kah.svg",
		stableTokenId: "native::kah",
		blockExplorerUrl: "https://assethub-kusama.subscan.io",
	},
	{
		id: "rococo",
		name: "Rococo",
		wsUrl: "wss://rococo-rpc.polkadot.io",
		relay: "rococo",
		paraId: null,
		logo: "./img/tokens/ROC.svg",
		stableTokenId: null,
		blockExplorerUrl: "https://rococo.subscan.io",
	},
	{
		id: "rah",
		name: "Rococo Asset Hub",
		wsUrl: "wss://rococo-asset-hub-rpc.polkadot.io",
		relay: "rococo",
		paraId: 1000,
		logo: "./img/chains/rah.svg",
		stableTokenId: "native::rah",
		blockExplorerUrl: "https://assethub-rococo.subscan.io",
	},
	{
		id: "westend",
		name: "Westend",
		wsUrl: "wss://westend-rpc.polkadot.io",
		relay: "westend",
		paraId: null,
		logo: "./img/tokens/WND.svg",
		stableTokenId: null,
		blockExplorerUrl: "https://westend.subscan.io",
	},
	{
		id: "wah",
		name: "Westend Asset Hub",
		wsUrl: "wss://westend-asset-hub-rpc.polkadot.io",
		relay: "westend",
		paraId: 1000,
		logo: "./img/chains/wah.svg",
		stableTokenId: "native::wah",
		blockExplorerUrl: "https://assethub-westend.subscan.io",
	},
];

const CHAINS = PROD_CHAINS.concat(DEV ? DEV_CHAINS : []);
const CHAINS_MAP = Object.fromEntries(CHAINS.map((chain) => [chain.id, chain]));

export const getChains = () => CHAINS;

export const getChainById = <T extends Chain>(id: ChainId): T => {
	if (!CHAINS_MAP[id]) throw new Error(`Could not find chain ${id}`);

	return CHAINS_MAP[id] as T;
};

export const isAssetHub = (chain: Chain): chain is ChainAssetHub => {
	return chain.paraId === 1000;
};

export const isRelay = (chain: Chain): chain is ChainRelay => {
	return chain.paraId === null;
};

// TODO
export const hasAssetPallet = isAssetHub;

// TODO
export const hasAssetConvertionPallet = isAssetHub;
