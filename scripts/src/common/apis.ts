import {
	devah,
	devrelay,
	kah,
	pah,
	rah,
	rococo,
	wah,
	westend,
} from "@polkadot-api/descriptors";
import { type TypedApi, createClient } from "polkadot-api";
import { WebSocketProvider } from "polkadot-api/ws-provider/web";
import papiConfig from "../../.papi/polkadot-api.json";

const descriptors = {
	devrelay,
	rococo,
	westend,
	devah,
	wah,
	kah,
	rah,
	pah,
} as const;

type Descriptors = typeof descriptors;

export type ChainId = keyof Descriptors;

export type AssetHubChainId = "devah" | "wah" | "rah" | "pah" | "kah";
export type RelayChainId = "devrelay" | "rococo" | "westend";

export type Api<Id extends ChainId> = TypedApi<Descriptors[Id]>;

const getProvider = async (chainId: ChainId) => {
	const wsUrl = papiConfig.entries[chainId]?.wsUrl as string;
	if (!wsUrl) throw new Error(`wsUrl not found for chainId: ${chainId}`);
	return WebSocketProvider(wsUrl);
};

export const getApi = async <Id extends keyof typeof descriptors>(
	chainId: Id,
): Promise<Api<Id>> => {
	const provider = await getProvider(chainId);
	const client = createClient(provider);

	return client.getTypedApi(descriptors[chainId]);
};
