import { createClient, type PolkadotClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { getChainById } from "../registry/chains/chains";
import type { Chain, ChainId } from "../registry/chains/types";
import { getCachedPromise } from "../utils/getCachedPromise";
import { getChainSpec, hasChainSpec } from "./getChainSpec";
import { getScChainProvider } from "./getScChainProvider";
import { getSmChainProvider } from "./getSmChainProvider";
import { isScAvailableScProvider } from "./isScAvailable";
import { getCachedMetadata, setCachedMetadata } from "./metadataCache";

type ClientOptions = {
	lightClients: boolean;
};

const getClientCacheId = (chainId: ChainId, { lightClients }: ClientOptions) =>
	`${chainId}-${lightClients}`;

const metadataCacheOptions = {
	getMetadata: getCachedMetadata,
	setMetadata: setCachedMetadata,
};

export const getClient = (
	chainId: ChainId,
	options: ClientOptions,
): Promise<PolkadotClient> => {
	return getCachedPromise(
		"getClient",
		getClientCacheId(chainId, options),
		() => {
			const chain = getChainById(chainId);
			return getAssetHubClient(chain, options);
		},
	);
};

const getAssetHubClient = async (chain: Chain, options: ClientOptions) => {
	const { id: chainId, relay: relayId } = chain;

	if (!options.lightClients || !hasChainSpec(chainId) || !hasChainSpec(relayId))
		return createClient(
			withPolkadotSdkCompat(getWsProvider(chain.wsUrl)),
			metadataCacheOptions,
		);

	const [relayChainSpec, paraChainSpec] = await Promise.all([
		getChainSpec(relayId),
		getChainSpec(chainId),
	] as const);

	// use substrate-connect if available
	if (await isScAvailableScProvider())
		return createClient(
			getScChainProvider({
				chainId: chain.id,
				chainSpec: paraChainSpec,
				relayChainId: relayId,
			}),
			metadataCacheOptions,
		);

	return createClient(
		await getSmChainProvider(
			{ chainId: chain.id, chainSpec: paraChainSpec },
			{ chainId: relayId, chainSpec: relayChainSpec },
		),
		metadataCacheOptions,
	);
};
