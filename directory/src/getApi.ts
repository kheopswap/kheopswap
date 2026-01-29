import {
	type ChainId,
	type Descriptors,
	getChainById,
	getDescriptors,
} from "@kheopswap/registry";
import { createClient, type PolkadotClient, type TypedApi } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/node";

type ApiBase<Id extends ChainId> = TypedApi<Descriptors<Id>>;

export type Api<Id extends ChainId> = ApiBase<Id> & {
	chainId: Id;
	waitReady: Promise<void>;
	client: PolkadotClient;
};

// Cache for clients and APIs
const clients = new Map<ChainId, PolkadotClient>();
const apis = new Map<ChainId, Api<ChainId>>();

/**
 * Get a Polkadot API client for the given chain.
 * Uses RPC directly (no light clients) for Node.js compatibility.
 */
export const getApi = async <Id extends ChainId>(
	chainId: Id,
): Promise<Api<Id>> => {
	// Return cached API if available
	const cachedApi = apis.get(chainId);
	if (cachedApi) return cachedApi as Api<Id>;

	const chain = getChainById(chainId);
	if (!chain) throw new Error(`Could not find chain ${chainId}`);

	const descriptors = getDescriptors(chain.id);
	if (!descriptors)
		throw new Error(`Could not find descriptors for chain ${chain.id}`);

	// Get all WS URLs for fallback support
	const wsUrls = Array.isArray(chain.wsUrl) ? chain.wsUrl : [chain.wsUrl];
	if (wsUrls.length === 0)
		throw new Error(`No WS URL found for chain ${chainId}`);

	console.log(`Connecting to ${chainId} via ${wsUrls.join(", ")}...`);

	// Create client using Node.js WebSocket provider with multiple endpoints
	const client = createClient(withPolkadotSdkCompat(getWsProvider(wsUrls)));
	clients.set(chainId, client);

	const api = client.getTypedApi(descriptors) as Api<Id>;
	api.chainId = chainId;
	api.client = client;

	// Wait for first block to ensure connection is ready
	api.waitReady = new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`Connection timeout for ${chainId}`));
		}, 60_000);

		client.bestBlocks$.subscribe({
			next: () => {
				clearTimeout(timeout);
				resolve();
			},
			error: reject,
		}).unsubscribe;
	});

	apis.set(chainId, api);
	return api;
};

/**
 * Disconnect all clients
 */
export const disconnectAll = async (): Promise<void> => {
	for (const [chainId, client] of clients) {
		console.log(`Disconnecting from ${chainId}...`);
		client.destroy();
	}
	clients.clear();
	apis.clear();
};
