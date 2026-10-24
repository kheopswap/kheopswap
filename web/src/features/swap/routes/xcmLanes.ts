import type { ChainId } from "../../../registry/chains/types";

type XcmTransferType = "LocalReserve" | "DestinationReserve" | "Teleport";

type XcmLaneSpec = { transferType: XcmTransferType };

const XCM_LANES = {
	pah: { hydration: { transferType: "LocalReserve" } },
	hydration: { pah: { transferType: "DestinationReserve" } },
} as const satisfies {
	readonly [Origin in ChainId]?: {
		readonly [Destination in Exclude<ChainId, Origin>]?: XcmLaneSpec;
	};
};

type XcmLanes = typeof XCM_LANES;

type XcmOrigin = keyof XcmLanes;

type XcmLaneFrom<Origin extends XcmOrigin> = {
	[O in Origin]: {
		[D in keyof XcmLanes[O]]: { origin: O; destination: D };
	}[keyof XcmLanes[O]];
}[Origin];

export type XcmLane = XcmLaneFrom<XcmOrigin>;

const LANE_SPECS: {
	[O in XcmOrigin]: { [D in keyof XcmLanes[O]]: XcmLaneSpec };
} = XCM_LANES;

const CHAIN_PAIRS: Partial<
	Record<ChainId, Partial<Record<ChainId, XcmLaneSpec>>>
> = XCM_LANES;

export const isXcmLane = (pair: {
	origin: ChainId;
	destination: ChainId;
}): pair is XcmLane => !!CHAIN_PAIRS[pair.origin]?.[pair.destination];

export const getXcmTransferType = <Origin extends XcmOrigin>(
	lane: XcmLaneFrom<Origin>,
): XcmTransferType => LANE_SPECS[lane.origin][lane.destination].transferType;
