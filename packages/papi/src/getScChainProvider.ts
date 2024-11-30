import {
	type Chain,
	type ScClient,
	WellKnownChain,
	createScClient,
} from "@substrate/connect";

import type { ChainId, ChainIdRelay } from "@kheopswap/registry";
import { getSmProvider } from "polkadot-api/sm-provider";

// No intellisense on WellKnownChain ?
const getWellKnownChain = (chainId: ChainId): WellKnownChain | null => {
	switch (chainId) {
		case "polkadot":
			return WellKnownChain.polkadot;
		case "westend":
			return WellKnownChain.westend2;
		case "kusama":
			return WellKnownChain.ksmcc3;
		case "paseo":
			return WellKnownChain.paseo;
		default:
			return null;
	}
};

let client: ScClient;

type ScProviderProps = {
	chainId: ChainId;
	relayChainId?: ChainIdRelay;
	chainSpec: string;
};

const getScChain = async ({
	chainId,
	relayChainId,
	chainSpec,
}: ScProviderProps) => {
	const wellKnownChain = getWellKnownChain(chainId);
	const wellKnownRelay = relayChainId ? getWellKnownChain(relayChainId) : null;

	let chain: Chain;
	try {
		const relayChain = wellKnownRelay
			? await client.addWellKnownChain(wellKnownRelay)
			: undefined;
		chain = relayChain
			? await relayChain.addChain(chainSpec, { disableJsonRpc: true })
			: wellKnownChain
				? await client.addWellKnownChain(wellKnownChain)
				: await client.addChain(chainSpec);
	} catch (e) {
		console.error(e);
		throw e;
	}

	return chain;
};

export const getScChainProvider = ({
	chainId,
	relayChainId,
	chainSpec,
}: ScProviderProps) => {
	client ??= createScClient();

	return getSmProvider(getScChain({ chainId, relayChainId, chainSpec }));
};
