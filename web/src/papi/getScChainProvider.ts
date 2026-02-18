import {
	type Chain,
	createScClient,
	type ScClient,
	WellKnownChain,
} from "@substrate/connect";
import { getSmProvider } from "polkadot-api/sm-provider";
import type { ChainId, RelayId } from "../registry/chains/types";

// No intellisense on WellKnownChain ?
const getWellKnownChain = (
	chainId: ChainId | RelayId,
): WellKnownChain | null => {
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
	relayChainId?: RelayId;
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
