import { getSmProvider } from "polkadot-api/sm-provider";

import type { ChainId } from "@kheopswap/registry";

type Chain = Awaited<Parameters<typeof getSmProvider>[0]>;

type ChainDef = {
	chainId: ChainId;
	chainSpec: string;
};

const SMOLDOT_CHAINS_CACHE = new Map<string, Promise<Chain>>();

const loadChain = async ({ chainId, chainSpec }: ChainDef, relay?: Chain) => {
	// lazy load only if necessary
	const { smoldot } = await import("./smoldot");

	if (!SMOLDOT_CHAINS_CACHE.has(chainId))
		SMOLDOT_CHAINS_CACHE.set(
			chainId,
			smoldot.addChain({
				chainSpec,
				potentialRelayChains: relay ? [relay] : undefined,
			}),
		);

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	return SMOLDOT_CHAINS_CACHE.get(chainId)!;
};

export const getSmChainProvider = async (
	chainDef: ChainDef,
	relayDef?: ChainDef,
) => {
	const relay = relayDef ? await loadChain(relayDef) : undefined;
	const chain = await loadChain(chainDef, relay);

	return getSmProvider(chain);
};
