import chainsProdJson from "./chains.prod.json";
import {
	DESCRIPTORS,
	DESCRIPTORS_ASSET_HUB,
	DESCRIPTORS_HYDRATION,
} from "./descriptors";
import type {
	Chain,
	ChainAssetHub,
	ChainId,
	ChainIdAssetHub,
	ChainIdHydration,
	Descriptors,
	RelayId,
} from "./types";

const CHAINS = chainsProdJson as Chain[];

const CHAINS_MAP = Object.fromEntries(CHAINS.map((chain) => [chain.id, chain]));

export const getRelayIds = (): RelayId[] =>
	[...new Set(CHAINS.map((chain) => chain.relay))] as RelayId[];

export const isChainIdAssetHub = (id: unknown): id is ChainIdAssetHub =>
	typeof id === "string" && !!DESCRIPTORS_ASSET_HUB[id as ChainIdAssetHub];

export const isChainIdHydration = (id: unknown): id is ChainIdHydration =>
	typeof id === "string" && !!DESCRIPTORS_HYDRATION[id as ChainIdHydration];

export const isChainAssetHub = (chain: Chain): chain is ChainAssetHub =>
	isChainIdAssetHub(chain.id) && chain.paraId === 1000;

export const getDescriptors = (id: ChainId): Descriptors<ChainId> =>
	DESCRIPTORS[id];

export const getChains = () => CHAINS;

export function getChainById(id: ChainIdAssetHub): ChainAssetHub;
export function getChainById(id: ChainId): Chain;
export function getChainById(id: ChainId): Chain {
	const chain = CHAINS_MAP[id];
	if (!chain) throw new Error(`Could not find chain ${id}`);

	return chain;
}
