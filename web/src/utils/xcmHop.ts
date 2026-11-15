import {
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import {
	getAssetHubBridge,
	getChainById,
	isChainIdAssetHub,
} from "../registry/chains/chains";
import type { Chain, ChainId } from "../registry/chains/types";
import type { XcmV5Multilocation } from "../registry/types/xcm";
import {
	getChainLocation,
	getNetworkRelayId,
	getRelayNetwork,
	reanchorLocation,
} from "../registry/utils/chainLocation";

export type XcmHop<From extends ChainId = ChainId> = {
	from: From;
	to: ChainId;
};

const getSiblingLocation = (paraId: number): XcmV5Multilocation => ({
	parents: 1,
	interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
});

const isParachainInterior = (interior: XcmV5Junctions, paraId: number) =>
	interior.type === "X1" &&
	interior.value.type === "Parachain" &&
	interior.value.value === paraId;

const getBridgeHop = ({ from, to }: XcmHop) => {
	if (!isChainIdAssetHub(from) || !isChainIdAssetHub(to)) return undefined;
	const outbound = getAssetHubBridge(from);
	const inbound = getAssetHubBridge(to);
	return outbound?.bridgedAssetHubId === to &&
		inbound?.bridgedAssetHubId === from
		? { outbound, inbound }
		: undefined;
};

export const isBridgeHop = (hop: XcmHop): boolean => !!getBridgeHop(hop);

export const getHopDestination = ({ from, to }: XcmHop): XcmV5Multilocation => {
	const location = getChainLocation({
		from: getChainById(from),
		to: getChainById(to),
	});
	if (!location) throw new Error(`${from} cannot address ${to}`);
	return location;
};

export const isHopDestination = (
	location: XcmV5Multilocation,
	{ from, to }: XcmHop,
): boolean => {
	const seenFromDestination = reanchorLocation(location, {
		from: getChainById(from),
		to: getChainById(to),
	});
	return (
		seenFromDestination?.parents === 0 &&
		seenFromDestination.interior.type === "Here"
	);
};

const getExportedMessages = (
	message: XcmVersionedXcm,
	to: Chain,
): XcmVersionedXcm[] =>
	message.type === "V5"
		? message.value.flatMap((instruction) =>
				instruction.type === "ExportMessage" &&
				getNetworkRelayId(instruction.value.network) === to.relay &&
				isParachainInterior(instruction.value.destination, to.paraId)
					? [XcmVersionedXcm.V5(instruction.value.xcm)]
					: [],
			)
		: [];

export const findHopMessage = (
	forwardedXcms: [XcmVersionedLocation, XcmVersionedXcm[]][],
	hop: XcmHop,
): XcmVersionedXcm | undefined => {
	const bridge = getBridgeHop(hop);
	if (!bridge)
		return forwardedXcms.find(
			([location]) =>
				location.type === "V5" && isHopDestination(location.value, hop),
		)?.[1][0];

	const to = getChainById(hop.to);
	return forwardedXcms
		.filter(
			([{ type, value }]) =>
				type === "V5" &&
				value.parents === 1 &&
				isParachainInterior(value.interior, bridge.outbound.bridgeHubParaId),
		)
		.flatMap(([, messages]) => messages)
		.flatMap((message) => getExportedMessages(message, to))[0];
};

export type XcmHopInbound = {
	origin: XcmVersionedLocation;
	message: XcmVersionedXcm;
};

export const getHopInbound = (
	hop: XcmHop,
	message: XcmVersionedXcm,
): XcmHopInbound => {
	const from = getChainById(hop.from);
	const bridge = getBridgeHop(hop);
	if (!bridge)
		return {
			origin: XcmVersionedLocation.V5(getSiblingLocation(from.paraId)),
			message,
		};

	const network = getRelayNetwork(from.relay);
	if (!network || message.type !== "V5")
		throw new Error(`The bridge cannot deliver this message from ${from.id}`);

	return {
		origin: XcmVersionedLocation.V5(
			getSiblingLocation(bridge.inbound.bridgeHubParaId),
		),
		message: XcmVersionedXcm.V5([
			XcmV5Instruction.DescendOrigin(
				XcmV5Junctions.X1(
					XcmV5Junction.PalletInstance(
						bridge.inbound.bridgeMessagesPalletInstance,
					),
				),
			),
			XcmV5Instruction.UniversalOrigin(XcmV5Junction.GlobalConsensus(network)),
			XcmV5Instruction.DescendOrigin(
				XcmV5Junctions.X1(XcmV5Junction.Parachain(from.paraId)),
			),
			...message.value,
		]),
	};
};
