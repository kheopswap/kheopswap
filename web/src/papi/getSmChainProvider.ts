import { getSmProvider } from "polkadot-api/sm-provider";
import type { ChainId, RelayId } from "../registry/chains/types";
import { getCachedPromise } from "../utils/getCachedPromise";

type Chain = Awaited<Parameters<typeof getSmProvider>[0]>;

type ChainDef = {
	chainId: ChainId;
	chainSpec: string;
};

type RelayChainDef = {
	chainId: RelayId;
	chainSpec: string;
};

const loadChain = async (
	{ chainId, chainSpec }: ChainDef | RelayChainDef,
	relay?: Chain,
) => {
	return getCachedPromise("loadChain", chainId, async () => {
		const { smoldot } = await import("./smoldot");

		return smoldot.addChain({
			chainSpec,
			potentialRelayChains: relay ? [relay] : undefined,
		});
	});
};

export const getSmChainProvider = async (
	chainDef: ChainDef,
	relayDef?: RelayChainDef,
) => {
	const relay = relayDef ? await loadChain(relayDef) : undefined;
	const chain = await loadChain(chainDef, relay);

	return getSmProvider(chain);
};
