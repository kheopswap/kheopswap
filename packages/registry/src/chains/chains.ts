import { USE_CHOPSTICKS } from "@kheopswap/constants";

import chainsDevJson from "./chains.chopsticks.json";
import chainsProdJson from "./chains.prod.json";
import {
	DESCRIPTORS_ALL,
	DESCRIPTORS_ASSET_HUB,
	DESCRIPTORS_BIFROST_POLKADOT,
	DESCRIPTORS_HYDRATION,
	DESCRIPTORS_MOONBEAM,
	DESCRIPTORS_MYTHOS,
	DESCRIPTORS_RELAY,
} from "./descriptors";
import type {
	Chain,
	ChainAssetHub,
	ChainBifrostPolkadot,
	ChainHydration,
	ChainId,
	ChainIdAssetHub,
	ChainIdBifrostPolkadot,
	ChainIdHydration,
	ChainIdMoonbeam,
	ChainIdMythos,
	ChainIdRelay,
	ChainMoonbeam,
	ChainRelay,
	Descriptors,
} from "./types";

export const PARA_ID_ASSET_HUB = 1000;
export const PARA_ID_HYDRATION = 2034;
export const PARA_ID_MYTHOS = 3369;
export const PARA_ID_MOONBEAM = 2004;
export const PARA_ID_BIFROST_POLKADOT = 2030;

const DEV_CHAINS = chainsDevJson as Chain[];
const PROD_CHAINS = chainsProdJson as Chain[];

const DEV_CHAINS_MAP = Object.fromEntries(
	DEV_CHAINS.map((chain) => [chain.id, chain]),
);

// override with chopstick config if necessary
const CHAINS = USE_CHOPSTICKS
	? PROD_CHAINS.filter((chain) => !!DEV_CHAINS_MAP[chain.id])
			// .filter((chain) => chain.id !== "hydration") // TODO remove filter when ready
			.map((chain) => Object.assign(chain, DEV_CHAINS_MAP[chain.id]))
	: PROD_CHAINS; //.filter((chain) => chain.id !== "hydration"); // TODO remove filter when ready

const CHAINS_MAP = Object.fromEntries(CHAINS.map((chain) => [chain.id, chain]));

export const getRelayIds = () =>
	CHAINS.filter((chain) => chain.relay === chain.id).map((chain) => chain.id);

export const isChainIdAssetHub = (id: unknown): id is ChainIdAssetHub =>
	typeof id === "string" && !!DESCRIPTORS_ASSET_HUB[id as ChainIdAssetHub];
export const isChainIdRelay = (id: unknown): id is ChainIdRelay =>
	typeof id === "string" && !!DESCRIPTORS_RELAY[id as ChainIdRelay];
export const isChainIdHydration = (id: unknown): id is ChainIdHydration =>
	typeof id === "string" && !!DESCRIPTORS_HYDRATION[id as ChainIdHydration];
export const isChainIdMythos = (id: unknown): id is ChainIdMythos =>
	typeof id === "string" && !!DESCRIPTORS_MYTHOS[id as ChainIdMythos];
export const isChainIdMoonbeam = (id: unknown): id is ChainIdMoonbeam =>
	typeof id === "string" && !!DESCRIPTORS_MOONBEAM[id as ChainIdMoonbeam];
export const isChainIdBifrostPolkadot = (
	id: unknown,
): id is ChainIdBifrostPolkadot =>
	typeof id === "string" &&
	!!DESCRIPTORS_BIFROST_POLKADOT[id as ChainIdBifrostPolkadot];

export type ChainIdWithDryRun =
	| ChainIdRelay
	| ChainIdAssetHub
	| ChainIdMoonbeam
	| ChainIdBifrostPolkadot;

export const isChainIdWithDryRun = (id: unknown): id is ChainIdWithDryRun =>
	isChainIdRelay(id) ||
	isChainIdAssetHub(id) ||
	isChainIdMoonbeam(id) ||
	isChainIdBifrostPolkadot(id);

export const getDescriptors = (id: ChainId): Descriptors<ChainId> =>
	DESCRIPTORS_ALL[id];

export const getChains = () => CHAINS;

export const getChainById = <T extends Chain>(id: ChainId): T => {
	if (!CHAINS_MAP[id]) throw new Error(`Could not find chain ${id}`);

	return CHAINS_MAP[id] as T;
};

export const isAssetHub = (chain: Chain): chain is ChainAssetHub => {
	return chain.paraId === PARA_ID_ASSET_HUB;
};
export const isRelay = (chain: Chain): chain is ChainRelay => {
	return chain.paraId === null;
};
export const isHydration = (chain: Chain): chain is ChainHydration => {
	return chain.paraId === PARA_ID_HYDRATION;
};
export const isMythos = (chain: Chain): chain is ChainHydration => {
	return chain.paraId === PARA_ID_MYTHOS;
};
export const isMoonbeam = (chain: Chain): chain is ChainMoonbeam => {
	return chain.paraId === PARA_ID_MOONBEAM;
};
export const isBifrostPolkadot = (
	chain: Chain,
): chain is ChainBifrostPolkadot => {
	return chain.paraId === PARA_ID_BIFROST_POLKADOT;
};

// TODO
export const hasAssetPallet = isAssetHub;

// TODO
export const hasAssetConvertionPallet = isAssetHub;
