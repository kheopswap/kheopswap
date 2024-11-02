import { type PolkadotClient, createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";

import { getChainSpec, hasChainSpec } from "./getChainSpec";
import { getScChainProvider } from "./getScChainProvider";
import { getSmChainProvider } from "./getSmChainProvider";
import { isScAvailableScProvider } from "./isScAvailable";

import {
	type Chain,
	type ChainId,
	type ChainRelay,
	getChainById,
	isRelay,
} from "@kheopswap/registry";
import { getCachedPromise } from "@kheopswap/utils";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
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

			return isRelay(chain)
				? getRelayChainClient(chain, options)
				: getParaChainClient(chain, options);
		},
	);
};

const getRelayChainClient = async (
	chain: ChainRelay,
	options: ClientOptions,
) => {
	// force ws provider if light clients are disabled or chainSpec is not available
	if (!options.lightClients || !hasChainSpec(chain.id))
		return createClient(withPolkadotSdkCompat(getWsProvider(chain.wsUrl)));

	const chainSpec = await getChainSpec(chain.id);

	// use substrate-connect if available
	if (await isScAvailableScProvider())
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
		return createClient(withPolkadotSdkCompat(getWsProvider(chain.wsUrl)));

	const [relayChainSpec, paraChainSpec] = await Promise.all([
		getChainSpec(relayChainId),
		getChainSpec(paraChainId),
	] as const);

	// use substrate-connect if available
	if (await isScAvailableScProvider())
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
