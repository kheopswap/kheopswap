import type { PolkadotClient, TypedApi } from "polkadot-api";
import { firstValueFrom, from, type Observable } from "rxjs";
import { DISABLE_LIGHT_CLIENTS } from "../common/constants";
import { getSetting } from "../common/settings";
import { getChainById, getDescriptors } from "../registry/chains/chains";
import type { ChainId, Descriptors } from "../registry/chains/types";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { getCachedPromise } from "../utils/getCachedPromise";
import { logger } from "../utils/logger";
import { getClient } from "./getClient";

type ApiBase<Id extends ChainId> = TypedApi<Descriptors<Id>>;

export type Api<Id extends ChainId> = ApiBase<Id> & {
	chainId: Id;
	client: PolkadotClient;
	waitReady: Promise<void>;
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
	api.client = client;
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
	const lightClients = !DISABLE_LIGHT_CLIENTS && getSetting("lightClients");

	const api = await getCachedPromise("getApi", `${id}-${lightClients}`, () =>
		getApiInner(id, lightClients),
	);

	if (waitReady) await api.waitReady;

	return api as Papi;
};

export const getApi$ = <Id extends ChainId, Papi = Api<Id>>(
	id: Id,
): Observable<Papi> => {
	return getCachedObservable$(
		"getApi$",
		id,
		() => from(getApi(id as ChainId)) as Observable<Papi>,
	);
};
