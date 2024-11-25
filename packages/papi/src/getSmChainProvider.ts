import { getSmProvider } from "polkadot-api-test/sm-provider";

import type { ChainId } from "@kheopswap/registry";
import { getCachedPromise } from "@kheopswap/utils";

type Chain = Awaited<Parameters<typeof getSmProvider>[0]>;

type ChainDef = {
	chainId: ChainId;
	chainSpec: string;
};

const loadChain = async ({ chainId, chainSpec }: ChainDef, relay?: Chain) => {
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
	relayDef?: ChainDef,
) => {
	const relay = relayDef ? await loadChain(relayDef) : undefined;
	const chain = await loadChain(chainDef, relay);

	return getSmProvider(chain);
};
