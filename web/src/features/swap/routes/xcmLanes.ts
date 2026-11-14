import type { ChainId } from "../../../registry/chains/types";
import { getTokenId } from "../../../registry/tokens/helpers";
import type { TokenId } from "../../../registry/tokens/types";

type XcmTransferType = "LocalReserve" | "DestinationReserve" | "Teleport";

type XcmLaneSpec =
	| { kind: "relay"; transferType: XcmTransferType }
	| { kind: "bridge" };

const XCM_LANES = {
	pah: {
		hydration: { kind: "relay", transferType: "LocalReserve" },
		ppeople: { kind: "relay", transferType: "Teleport" },
		kah: { kind: "bridge" },
	},
	kah: {
		kpeople: { kind: "relay", transferType: "Teleport" },
		pah: { kind: "bridge" },
	},
	wah: { wpeople: { kind: "relay", transferType: "Teleport" } },
	pasah: { paspeople: { kind: "relay", transferType: "Teleport" } },
	hydration: { pah: { kind: "relay", transferType: "DestinationReserve" } },
	ppeople: { pah: { kind: "relay", transferType: "Teleport" } },
	kpeople: { kah: { kind: "relay", transferType: "Teleport" } },
	wpeople: { wah: { kind: "relay", transferType: "Teleport" } },
} as const satisfies {
	readonly [Origin in ChainId]?: {
		readonly [Destination in Exclude<ChainId, Origin>]?: XcmLaneSpec;
	};
};

type XcmLanes = typeof XCM_LANES;

type XcmOrigin = keyof XcmLanes;

type XcmLaneKind = XcmLaneSpec["kind"];

type XcmLaneFrom<
	Origin extends XcmOrigin,
	Kind extends XcmLaneKind = XcmLaneKind,
> = {
	[O in Origin]: {
		[D in keyof XcmLanes[O]]: XcmLanes[O][D] extends { kind: Kind }
			? { origin: O; destination: D }
			: never;
	}[keyof XcmLanes[O]];
}[Origin];

export type XcmLane = XcmLaneFrom<XcmOrigin>;

export type XcmRelayLane = XcmLaneFrom<XcmOrigin, "relay">;

export type XcmBridgeLane = XcmLaneFrom<XcmOrigin, "bridge">;

const LANE_SPECS: {
	[O in XcmOrigin]: { [D in keyof XcmLanes[O]]: XcmLaneSpec };
} = XCM_LANES;

const CHAIN_PAIRS: Partial<
	Record<ChainId, Partial<Record<ChainId, XcmLaneSpec>>>
> = XCM_LANES;

type ChainPair = { origin: ChainId; destination: ChainId };

export const isXcmLane = (pair: ChainPair): pair is XcmLane =>
	!!CHAIN_PAIRS[pair.origin]?.[pair.destination];

export const isBridgeLane = (pair: ChainPair): pair is XcmBridgeLane =>
	CHAIN_PAIRS[pair.origin]?.[pair.destination]?.kind === "bridge";

const getLaneSpec = <Origin extends XcmOrigin>(
	lane: XcmLaneFrom<Origin>,
): XcmLaneSpec => LANE_SPECS[lane.origin][lane.destination];

export function getXcmTransferType(lane: XcmRelayLane): XcmTransferType;
export function getXcmTransferType(
	lane: XcmLane,
	tokenIdIn: TokenId,
): XcmTransferType;
export function getXcmTransferType(
	lane: XcmLane,
	tokenIdIn?: TokenId,
): XcmTransferType {
	const spec = getLaneSpec(lane);
	switch (spec.kind) {
		case "relay":
			return spec.transferType;
		case "bridge":
			return tokenIdIn === getTokenId({ type: "native", chainId: lane.origin })
				? "LocalReserve"
				: "DestinationReserve";
	}
}
