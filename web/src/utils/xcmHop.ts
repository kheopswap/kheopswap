import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
	type XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { getChainById } from "../registry/chains/chains";
import type { ChainId } from "../registry/chains/types";
import type { XcmV5Multilocation } from "../registry/types/xcm";

export type XcmHop<From extends ChainId = ChainId> = {
	from: From;
	to: ChainId;
};

const getSiblingLocation = (chainId: ChainId): XcmV5Multilocation => ({
	parents: 1,
	interior: XcmV5Junctions.X1(
		XcmV5Junction.Parachain(getChainById(chainId).paraId),
	),
});

const isSiblingLocation = (location: XcmV5Multilocation, chainId: ChainId) =>
	location.parents === 1 &&
	location.interior.type === "X1" &&
	location.interior.value.type === "Parachain" &&
	location.interior.value.value === getChainById(chainId).paraId;

export const getHopDestination = ({ to }: XcmHop): XcmV5Multilocation =>
	getSiblingLocation(to);

export const isHopDestination = (
	location: XcmV5Multilocation,
	{ to }: XcmHop,
): boolean => isSiblingLocation(location, to);

export const findHopMessage = (
	forwardedXcms: [XcmVersionedLocation, XcmVersionedXcm[]][],
	hop: XcmHop,
): XcmVersionedXcm | undefined =>
	forwardedXcms.find(
		([location]) =>
			location.type === "V5" && isHopDestination(location.value, hop),
	)?.[1][0];

export type XcmHopInbound = {
	origin: XcmVersionedLocation;
	message: XcmVersionedXcm;
};

export const getHopInbound = (
	{ from }: XcmHop,
	message: XcmVersionedXcm,
): XcmHopInbound => ({
	origin: XcmVersionedLocation.V5(getSiblingLocation(from)),
	message,
});
