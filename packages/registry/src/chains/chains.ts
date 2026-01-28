import { USE_CHOPSTICKS } from "@kheopswap/constants";

import chainsDevJson from "./chains.chopsticks.json";
import chainsProdJson from "./chains.prod.json";
import { DESCRIPTORS_ASSET_HUB } from "./descriptors";
import type {
	Chain,
	ChainId,
	ChainIdAssetHub,
	Descriptors,
	RelayId,
} from "./types";

export const PARA_ID_ASSET_HUB = 1000;

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

export const getRelayIds = (): RelayId[] =>
	[...new Set(CHAINS.map((chain) => chain.relay))] as RelayId[];

export const isChainIdAssetHub = (id: unknown): id is ChainIdAssetHub =>
	typeof id === "string" && !!DESCRIPTORS_ASSET_HUB[id as ChainIdAssetHub];

export const getDescriptors = (id: ChainId): Descriptors<ChainId> =>
	DESCRIPTORS_ASSET_HUB[id];

export const getChains = () => CHAINS;

export const getChainById = <T extends Chain>(id: ChainId): T => {
	if (!CHAINS_MAP[id]) throw new Error(`Could not find chain ${id}`);

	return CHAINS_MAP[id] as T;
};
