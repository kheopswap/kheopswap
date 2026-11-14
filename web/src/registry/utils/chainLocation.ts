import {
	XcmV5Junction,
	type XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import type { Chain, RelayId } from "../chains/types";
import type { XcmV5Multilocation } from "../types/xcm";

type ChainPosition = Pick<Chain, "relay" | "paraId">;

type RelayLocation = { relay: RelayId; junctions: XcmV5Junction[] };

const RELAY_NETWORKS: Partial<Record<RelayId, XcmV5NetworkId>> = {
	polkadot: XcmV5NetworkId.Polkadot(),
	kusama: XcmV5NetworkId.Kusama(),
};

export const getNetworkRelayId = (
	network: XcmV5NetworkId,
): RelayId | undefined =>
	(Object.keys(RELAY_NETWORKS) as RelayId[]).find(
		(relay) => RELAY_NETWORKS[relay]?.type === network.type,
	);

const getJunctions = (interior: XcmV5Junctions): XcmV5Junction[] => {
	switch (interior.type) {
		case "Here":
			return [];
		case "X1":
			return [interior.value];
		default:
			return interior.value;
	}
};

const toLocation = (
	parents: number,
	junctions: XcmV5Junction[],
): XcmV5Multilocation | undefined => {
	const [first, ...rest] = junctions;
	if (!first) return { parents, interior: { type: "Here", value: undefined } };
	if (!rest.length) return { parents, interior: { type: "X1", value: first } };
	if (junctions.length > 8) return undefined;
	return {
		parents,
		interior: {
			type: `X${junctions.length}`,
			value: junctions,
		} as XcmV5Junctions,
	};
};

const toRelayLocation = (
	{ parents, interior }: XcmV5Multilocation,
	from: ChainPosition,
): RelayLocation | undefined => {
	const junctions = getJunctions(interior);
	switch (parents) {
		case 0:
			return {
				relay: from.relay,
				junctions: [XcmV5Junction.Parachain(from.paraId), ...junctions],
			};
		case 1:
			return { relay: from.relay, junctions };
		case 2: {
			const [consensus, ...rest] = junctions;
			const relay =
				consensus?.type === "GlobalConsensus"
					? getNetworkRelayId(consensus.value)
					: undefined;
			return relay && { relay, junctions: rest };
		}
		default:
			return undefined;
	}
};

const viewRelayLocation = (
	{ relay, junctions }: RelayLocation,
	to: ChainPosition,
): XcmV5Multilocation | undefined => {
	if (relay !== to.relay) {
		const network = RELAY_NETWORKS[relay];
		return (
			network &&
			toLocation(2, [XcmV5Junction.GlobalConsensus(network), ...junctions])
		);
	}
	const [first, ...rest] = junctions;
	return first?.type === "Parachain" && first.value === to.paraId
		? toLocation(0, rest)
		: toLocation(1, junctions);
};

const isOtherConsensusLocation = ({ parents, interior }: XcmV5Multilocation) =>
	parents === 2 && getJunctions(interior)[0]?.type === "GlobalConsensus";

export const getChainLocation = ({
	from,
	to,
}: {
	from: ChainPosition;
	to: ChainPosition;
}): XcmV5Multilocation | undefined =>
	viewRelayLocation(
		{ relay: to.relay, junctions: [XcmV5Junction.Parachain(to.paraId)] },
		from,
	);

export const reanchorLocation = (
	location: XcmV5Multilocation,
	{ from, to }: { from: ChainPosition; to: ChainPosition },
): XcmV5Multilocation | undefined => {
	const relayLocation = toRelayLocation(location, from);
	if (relayLocation) return viewRelayLocation(relayLocation, to);
	return isOtherConsensusLocation(location) ? location : undefined;
};
