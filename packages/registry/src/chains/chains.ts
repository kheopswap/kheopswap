import { USE_CHOPSTICKS } from "@kheopswap/constants";

import chainsDevJson from "./chains.chopsticks.json";
import chainsProdJson from "./chains.prod.json";
import {
	DESCRIPTORS_ALL,
	DESCRIPTORS_ASSET_HUB,
	DESCRIPTORS_RELAY,
} from "./descriptors";
import type {
	Chain,
	ChainAssetHub,
	ChainHydration,
	ChainId,
	ChainIdAssetHub,
	ChainIdRelay,
	ChainRelay,
	Descriptors,
} from "./types";

const DEV_CHAINS = chainsDevJson as Chain[];
const PROD_CHAINS = chainsProdJson as Chain[];

const DEV_CHAINS_MAP = Object.fromEntries(
	DEV_CHAINS.map((chain) => [chain.id, chain]),
);

// override with chopstick config if necessary
const CHAINS = USE_CHOPSTICKS
	? PROD_CHAINS.filter((chain) => !!DEV_CHAINS_MAP[chain.id]).map((chain) =>
			Object.assign(chain, DEV_CHAINS_MAP[chain.id]),
		)
	: PROD_CHAINS;

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

export const isHydration = (chain: Chain): chain is ChainHydration => {
	return chain.paraId === null;
};

// TODO
export const hasAssetPallet = isAssetHub;

// TODO
export const hasAssetConvertionPallet = isAssetHub;
