import { getSyncProvider } from "@polkadot-api/json-rpc-provider-proxy";
import {
	type Chain,
	type ScClient,
	WellKnownChain,
	createScClient,
} from "@substrate/connect";

import type { ChainId, ChainIdRelay } from "@kheopswap/registry";

// No intellisense on WellKnownChain ?
const getWellKnownChain = (chainId: ChainId): WellKnownChain | null => {
	switch (chainId) {
		case "polkadot":
			return WellKnownChain.polkadot;
		case "westend":
			return WellKnownChain.westend2;
		case "kusama":
			return WellKnownChain.ksmcc3;
		default:
			return null;
	}
};

const noop = () => {};

let client: ScClient;

type ScProviderProps = {
	chainId: ChainId;
	relayChainId?: ChainIdRelay;
	chainSpec: string;
};

export const getScChainProvider = ({
	chainId,
	relayChainId,
	chainSpec,
}: ScProviderProps) => {
	client ??= createScClient();

	const wellKnownChain = getWellKnownChain(chainId);
	const wellKnownRelay = relayChainId ? getWellKnownChain(relayChainId) : null;

	return getSyncProvider(async () => {
		let listener: (message: string) => void = noop;

		const onMessage = (msg: string): void => {
			listener(msg);
		};

		let chain: Chain;
		try {
			const relayChain = wellKnownRelay
				? await client.addWellKnownChain(wellKnownRelay)
				: undefined;
			chain = relayChain
				? await relayChain.addChain(chainSpec, onMessage)
				: wellKnownChain
					? await client.addWellKnownChain(wellKnownChain, onMessage)
					: await client.addChain(chainSpec, onMessage);
		} catch (e) {
			console.error(e);
			throw e;
		}

		return (onMessage) => {
			listener = onMessage;
			return {
				send(msg: string) {
					chain.sendJsonRpc(msg);
				},
				disconnect() {
					listener = noop;
					chain.remove();
				},
			};
		};
	});
};
