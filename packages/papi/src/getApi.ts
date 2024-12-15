import type { TypedApi } from "polkadot-api";
import {
	type Observable,
	catchError,
	firstValueFrom,
	from,
	map,
	of,
	startWith,
} from "rxjs";

import { getClient } from "./getClient";

import { USE_CHOPSTICKS } from "@kheopswap/constants";
import {
	type ChainId,
	type ChainIdAssetHub,
	type ChainIdBifrostPolkadot,
	type ChainIdHydration,
	type ChainIdMoonbeam,
	type ChainIdMythos,
	type ChainIdRelay,
	type ChainIdWithDryRun,
	type Descriptors,
	getChainById,
	getDescriptors,
	isChainIdAssetHub,
	isChainIdBifrostPolkadot,
	isChainIdHydration,
	isChainIdMoonbeam,
	isChainIdMythos,
	isChainIdRelay,
	isChainIdWithDryRun,
} from "@kheopswap/registry";
import { getSetting } from "@kheopswap/settings";
import {
	type LoadableState,
	getCachedObservable$,
	getCachedPromise,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
	logger,
} from "@kheopswap/utils";

type ApiBase<Id extends ChainId> = TypedApi<Descriptors<Id>>;

export type Api<Id extends ChainId> = ApiBase<Id> & {
	chainId: Id;
	waitReady: Promise<void>;
};

export const isApiOf = <Id extends ChainId>(
	api: unknown,
	chainId: Id,
): api is Api<Id> => {
	return !!api && (api as Api<ChainId>).chainId === chainId;
};

export const isApiIn = <Id extends ChainId, Ids extends ChainId[] = Id[]>(
	api: unknown,
	chainIds: Id[],
): api is Api<Ids[number]> => {
	return chainIds.some((chainId) => isApiOf(api, chainId));
};

export const isApiAssetHub = (
	api: Api<ChainId>,
): api is Api<ChainIdAssetHub> => {
	return isChainIdAssetHub(api.chainId);
};

export const isApiWithDryRun = (
	api: Api<ChainId>,
): api is Api<ChainIdWithDryRun> => {
	return isChainIdWithDryRun(api.chainId);
};

export const isApiRelay = (api: Api<ChainId>): api is Api<ChainIdRelay> => {
	return isChainIdRelay(api.chainId);
};

export const isApiHydration = (
	api: Api<ChainId>,
): api is Api<ChainIdHydration> => {
	return isChainIdHydration(api.chainId);
};
export const isApiMythos = (api: Api<ChainId>): api is Api<ChainIdMythos> => {
	return isChainIdMythos(api.chainId);
};
export const isApiMoonbeam = (
	api: Api<ChainId>,
): api is Api<ChainIdMoonbeam> => {
	return isChainIdMoonbeam(api.chainId);
};
export const isApiBifrostPolkadot = (
	api: Api<ChainId>,
): api is Api<ChainIdBifrostPolkadot> => {
	return isChainIdBifrostPolkadot(api.chainId);
};

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

export const getApi = async <Id extends ChainId, Papi = Api<Id>>(
	id: Id,
	waitReady = true,
): Promise<Papi> => {
	const lightClients = getSetting("lightClients") && !USE_CHOPSTICKS;

	const api = await getCachedPromise("getApi", `${id}-${lightClients}`, () =>
		getApiInner(id, lightClients),
	);

	if (waitReady) await api.waitReady;

	return api as Papi;
};

// TODO reemit if light clients change, and maybe if runtime changes ?
export const getApi$ = <Id extends ChainId, Papi = Api<Id>>(
	id: Id,
): Observable<Papi> => {
	return getCachedObservable$(
		"getApi$",
		id,
		() => from(getApi(id as ChainId)) as Observable<Papi>,
	);
};

export const getApiLoadable$ = <Id extends ChainId, Papi = Api<Id>>(
	id: Id,
): Observable<LoadableState<Papi>> => {
	return getApi$(id).pipe(
		map((api) => loadableStateData(api as Papi)),
		catchError((cause) =>
			of(loadableStateError<Papi>(new Error("Failed to get Api", { cause }))),
		),
		startWith(loadableStateLoading<Papi>()), // TODO test
	);
};
