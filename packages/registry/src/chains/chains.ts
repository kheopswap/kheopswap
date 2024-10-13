import { DEV } from "@kheopswap/constants";

import { logger } from "@kheopswap/utils";
import chainsDevJson from "./chains.dev.json";
import chainsProdJson from "./chains.prod.json";
import {
	DESCRIPTORS_ALL,
	DESCRIPTORS_ASSET_HUB,
	DESCRIPTORS_RELAY,
	type DescriptorsAll,
	type DescriptorsAssetHub,
	type DescriptorsRelay,
} from "./descriptors";

export type ChainIdAssetHub = keyof DescriptorsAssetHub;
export type ChainIdRelay = keyof DescriptorsRelay;
export type ChainId = ChainIdRelay | ChainIdAssetHub;
export type Descriptors<Id extends ChainId> = DescriptorsAll[Id];

export type Chain<Id = ChainId> = {
	id: Id;
	name: string;
	wsUrl: string[];
	relay: ChainIdRelay | null;
	paraId: number | null;
	logo: string;
	stableTokenId: string | null;
	blockExplorerUrl: string | null;
};

export type ChainRelay = Chain<ChainIdRelay> & { paraId: null };
export type ChainAssetHub = Chain<ChainIdAssetHub> & { paraId: 1000 };

const DEV_CHAINS = chainsDevJson as Chain[];
const PROD_CHAINS = chainsProdJson as Chain[];

const CHAINS = PROD_CHAINS.concat(DEV ? DEV_CHAINS : []).filter((chain) => {
	if (!DESCRIPTORS_ALL[chain.id]) {
		logger.warn(`Missing descriptors for chain ${chain.id}`);
		return false;
	}
	return true;
});

const CHAINS_MAP = Object.fromEntries(CHAINS.map((chain) => [chain.id, chain]));

export const isChainIdAssetHub = (id: unknown): id is ChainIdAssetHub =>
	typeof id === "string" && !!DESCRIPTORS_ASSET_HUB[id as ChainIdAssetHub];
export const isChainIdRelay = (id: unknown): id is ChainIdRelay =>
	typeof id === "string" && !!DESCRIPTORS_RELAY[id as ChainIdRelay];

export const getDescriptors = (id: ChainId): Descriptors<ChainId> =>
	DESCRIPTORS_ALL[id];

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
