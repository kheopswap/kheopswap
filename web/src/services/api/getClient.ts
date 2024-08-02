import { createClient, PolkadotClient } from "polkadot-api";
import { WebSocketProvider } from "polkadot-api/ws-provider/web";

import { getChainSpec, hasChainSpec } from "./getChainSpec";
import { getScChainProvider } from "./getScChainProvider";
import { isScAvailableScProvider } from "./isScAvailable";
import { getSmChainProvider } from "./getSmChainProvider";

import {
	Chain,
	ChainId,
	ChainRelay,
	getChainById,
	isRelay,
} from "src/config/chains";
type ClientOptions = {
	lightClients: boolean;
};

const getClientCacheId = (chainId: ChainId, { lightClients }: ClientOptions) =>
	`${chainId}-${lightClients}`;

const CLIENTS_CACHE = new Map<string, Promise<PolkadotClient>>();

export const getClient = (
	chainId: ChainId,
	options: ClientOptions,
): Promise<PolkadotClient> => {
	const cacheKey = getClientCacheId(chainId, options);

	if (!CLIENTS_CACHE.has(cacheKey)) {
		const chain = getChainById(chainId);

		CLIENTS_CACHE.set(
			cacheKey,
			isRelay(chain)
				? getRelayChainClient(chain, options)
				: getParaChainClient(chain, options),
		);
	}

	return CLIENTS_CACHE.get(cacheKey) as Promise<PolkadotClient>;
};

const getRelayChainClient = async (
	chain: ChainRelay,
	options: ClientOptions,
) => {
	// force ws provider if light clients are disabled or chainSpec is not available
	if (!options.lightClients || !hasChainSpec(chain.id))
		return createClient(WebSocketProvider(chain.wsUrl));

	const chainSpec = await getChainSpec(chain.id);

	// use substrate-connect if available
	if (chain.relay !== "rococo" && (await isScAvailableScProvider()))
		return createClient(getScChainProvider({ chainId: chain.id, chainSpec }));

	// fallback to smoldot
	return createClient(
		await getSmChainProvider({ chainId: chain.id, chainSpec }),
	);
};

const getParaChainClient = async (chain: Chain, options: ClientOptions) => {
	if (!chain.relay)
		throw new Error(`Chain ${chain.id} does not have a relay chain`);

	const { id: paraChainId, relay: relayChainId } = chain;

	if (
		!options.lightClients ||
		!hasChainSpec(paraChainId) ||
		!hasChainSpec(relayChainId)
	)
		return createClient(WebSocketProvider(chain.wsUrl));

	const [relayChainSpec, paraChainSpec] = await Promise.all([
		getChainSpec(relayChainId),
		getChainSpec(paraChainId),
	] as const);

	// use substrate-connect if available
	if (relayChainId !== "rococo" && (await isScAvailableScProvider()))
		return createClient(
			getScChainProvider({
				chainId: chain.id,
				chainSpec: paraChainSpec,
				relayChainId,
			}),
		);

	return createClient(
		await getSmChainProvider(
			{ chainId: chain.id, chainSpec: paraChainSpec },
			{ chainId: relayChainId, chainSpec: relayChainSpec },
		),
	);
};
