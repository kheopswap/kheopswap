import type { TypedApi } from "polkadot-api";
import { firstValueFrom } from "rxjs";

import { getClient } from "./getClient";

import { USE_CHOPSTICKS } from "@kheopswap/constants";
import {
	type ChainId,
	type ChainIdAssetHub,
	type ChainIdHydration,
	type ChainIdRelay,
	type Descriptors,
	getChainById,
	getDescriptors,
	isChainIdAssetHub,
	isChainIdHydration,
	isChainIdRelay,
} from "@kheopswap/registry";
import { getSetting } from "@kheopswap/settings";
import { logger } from "@kheopswap/utils";

type ApiBase<Id extends ChainId> = TypedApi<Descriptors<Id>>;

export type Api<Id extends ChainId> = ApiBase<Id> & {
	chainId: Id;
	waitReady: Promise<void>;
};

export const isApiAssetHub = (
	api: Api<ChainId>,
): api is Api<ChainIdAssetHub> => {
	return isChainIdAssetHub(api.chainId);
};

export const isApiRelay = (api: Api<ChainId>): api is Api<ChainIdRelay> => {
	return isChainIdRelay(api.chainId);
};

export const isApiHydration = (
	api: Api<ChainId>,
): api is Api<ChainIdHydration> => {
	return isChainIdHydration(api.chainId);
};

const getApiCacheId = (chainId: ChainId, lightClient: boolean): string =>
	`${chainId}-${lightClient}`;

const getApiInner = async <Id extends ChainId>(
	chainId: ChainId,
	lightClients: boolean,
): Promise<Api<Id>> => {
	const chain = getChainById(chainId);
	if (!chain) throw new Error(`Could not find chain ${chainId}`);

	const descriptors = getDescriptors(chain.id);
	if (!descriptors)
		throw new Error(`Could not find descriptors for chain ${chain.id}`);

	const client = await getClient(chainId, { lightClients });
	if (!client)
		throw new Error(
			`Could not create client for chain ${chainId}/${lightClients}`,
		);

	const api = client.getTypedApi(descriptors) as Api<Id>;
	api.chainId = chainId as Id;
	api.waitReady = new Promise<void>((resolve, reject) => {
		const stop = logger.timer(`api ${chainId} waitReady`);
		firstValueFrom(client.bestBlocks$)
			.then(() => resolve())
			.catch(reject)
			.finally(stop);
	});

	return api;
};

const API_CACHE = new Map<string, Promise<Api<ChainId>>>();

export const getApi = async <Id extends ChainId, Papi = Api<Id>>(
	id: Id,
	waitReady = true,
): Promise<Papi> => {
	const lightClients = getSetting("lightClients") && !USE_CHOPSTICKS;
	const cacheKey = getApiCacheId(id, lightClients);

	if (!API_CACHE.has(cacheKey))
		API_CACHE.set(cacheKey, getApiInner(id, lightClients));

	const api = (await API_CACHE.get(cacheKey)) as Api<Id>;

	if (waitReady) await api.waitReady;

	return api as Papi;
};
