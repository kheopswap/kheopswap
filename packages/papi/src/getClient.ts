import { type Chain, type ChainId, getChainById } from "@kheopswap/registry";
import { getCachedPromise } from "@kheopswap/utils";
import { createClient, type PolkadotClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { getChainSpec, hasChainSpec } from "./getChainSpec";
import { getScChainProvider } from "./getScChainProvider";
import { getSmChainProvider } from "./getSmChainProvider";
import { isScAvailableScProvider } from "./isScAvailable";

type ClientOptions = {
	lightClients: boolean;
};

const getClientCacheId = (chainId: ChainId, { lightClients }: ClientOptions) =>
	`${chainId}-${lightClients}`;

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
		return createClient(withPolkadotSdkCompat(getWsProvider(chain.wsUrl)));

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
		);

	return createClient(
		await getSmChainProvider(
			{ chainId: chain.id, chainSpec: paraChainSpec },
			{ chainId: relayId, chainSpec: relayChainSpec },
		),
	);
};
