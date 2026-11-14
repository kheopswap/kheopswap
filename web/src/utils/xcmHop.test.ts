import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { describe, expect, it } from "vitest";
import {
	type BridgeTransferFixture,
	dotKusamaToPolkadot,
	dotPolkadotToKusama,
	ksmKusamaToPolkadot,
	ksmPolkadotToKusama,
} from "../features/swap/routes/xcm/xcmBridge.fixtures";
import { dotPeopleToHydration } from "../features/swap/routes/xcm/xcmHubTransfer.fixtures";
import type { TxEvents } from "./getErrorMessageFromTxEvents";
import {
	findHopMessage,
	getHopDestination,
	getHopInbound,
	isBridgeHop,
	isHopDestination,
} from "./xcmHop";

const { originDryRun, hubDryRun } = dotPeopleToHydration;
if (!originDryRun.success || !hubDryRun.success)
	throw new Error("fixture dry run failed");

const PEOPLE_TO_HUB = { from: "ppeople", to: "pah" } as const;
const HUB_TO_HYDRATION = { from: "pah", to: "hydration" } as const;
const PEOPLE_TO_HYDRATION = { from: "ppeople", to: "hydration" } as const;

const getSentDestinations = (events: TxEvents) =>
	events.flatMap(({ type, value }) =>
		type === "PolkadotXcm" && value.type === "Sent"
			? [value.value.destination]
			: [],
	);

const [peopleForwarded] = originDryRun.value.forwarded_xcms;
const [hubForwarded] = hubDryRun.value.forwarded_xcms;
const [peopleSentTo] = getSentDestinations(originDryRun.value.emitted_events);
const [hubSentTo] = getSentDestinations(hubDryRun.value.emitted_events);
if (!peopleForwarded || !hubForwarded || !peopleSentTo || !hubSentTo)
	throw new Error("fixture sent no message");

const [peopleForwardedTo, [peopleMessage]] = peopleForwarded;
const [hubForwardedTo, [hubMessage]] = hubForwarded;
if (!peopleMessage || !hubMessage) throw new Error("fixture sent no message");

const sibling = (paraId: number) =>
	XcmVersionedLocation.V5({
		parents: 1,
		interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
	});

describe("getHopDestination", () => {
	it("addresses the chain each leg forwarded its message to", () => {
		expect(XcmVersionedLocation.V5(getHopDestination(PEOPLE_TO_HUB))).toEqual(
			peopleForwardedTo,
		);
		expect(
			XcmVersionedLocation.V5(getHopDestination(HUB_TO_HYDRATION)),
		).toEqual(hubForwardedTo);
	});
});

describe("findHopMessage", () => {
	it("picks the message each leg forwarded to the next chain", () => {
		expect(
			findHopMessage(originDryRun.value.forwarded_xcms, PEOPLE_TO_HUB),
		).toBe(peopleMessage);
		expect(
			findHopMessage(hubDryRun.value.forwarded_xcms, HUB_TO_HYDRATION),
		).toBe(hubMessage);
	});

	it("picks the hop's message among messages to other chains", () => {
		expect(
			findHopMessage(
				[
					...hubDryRun.value.forwarded_xcms,
					...originDryRun.value.forwarded_xcms,
				],
				PEOPLE_TO_HUB,
			),
		).toBe(peopleMessage);
	});

	it("finds nothing for a chain the leg did not send to", () => {
		expect(
			findHopMessage(originDryRun.value.forwarded_xcms, PEOPLE_TO_HYDRATION),
		).toBeUndefined();
	});
});

describe("getHopInbound", () => {
	it("delivers the message from the sending chain as a sibling", () => {
		expect(getHopInbound(PEOPLE_TO_HUB, peopleMessage)).toEqual({
			origin: sibling(1004),
			message: peopleMessage,
		});
	});

	it("delivers the hub's message from Asset Hub", () => {
		expect(getHopInbound(HUB_TO_HYDRATION, hubMessage)).toEqual({
			origin: sibling(1000),
			message: hubMessage,
		});
	});
});

describe("isHopDestination", () => {
	it("matches the destination of the Sent event each leg emitted", () => {
		expect(isHopDestination(peopleSentTo, PEOPLE_TO_HUB)).toBe(true);
		expect(isHopDestination(hubSentTo, HUB_TO_HYDRATION)).toBe(true);
	});

	it("rejects a Sent event to another chain", () => {
		expect(isHopDestination(peopleSentTo, PEOPLE_TO_HYDRATION)).toBe(false);
	});
});

const getBridgeLeg = ({
	origin,
	destination,
	originDryRun,
	inbound,
}: BridgeTransferFixture) => {
	if (!originDryRun.success || inbound?.message.type !== "V5")
		throw new Error("fixture has no bridge message");
	const { forwarded_xcms, emitted_events } = originDryRun.value;
	const [sentTo] = getSentDestinations(emitted_events);
	const [forwarded] = forwarded_xcms;
	if (!sentTo || !forwarded) throw new Error("fixture sent no message");

	return {
		hop: { from: origin, to: destination },
		back: { from: destination, to: origin },
		forwarded_xcms,
		forwardedTo: forwarded[0],
		sentTo,
		inbound,
		exported: XcmVersionedXcm.V5(inbound.message.value.slice(3)),
	};
};

const BRIDGE_LEGS = [
	["KSM from Kusama to Polkadot", getBridgeLeg(ksmKusamaToPolkadot)],
	["KSM from Polkadot to Kusama", getBridgeLeg(ksmPolkadotToKusama)],
	["DOT from Polkadot to Kusama", getBridgeLeg(dotPolkadotToKusama)],
	["DOT from Kusama to Polkadot", getBridgeLeg(dotKusamaToPolkadot)],
] as const;

describe("isBridgeHop", () => {
	it.each([
		[{ from: "pah", to: "kah" }, true],
		[{ from: "kah", to: "pah" }, true],
		[{ from: "pah", to: "hydration" }, false],
		[{ from: "kpeople", to: "kah" }, false],
		[{ from: "pah", to: "wah" }, false],
		[{ from: "pah", to: "kpeople" }, false],
	] as const)("tells whether %o crosses the bridge: %s", (hop, expected) => {
		expect(isBridgeHop(hop)).toBe(expected);
	});
});

describe.each(BRIDGE_LEGS)("a bridge hop carrying %s", (_, leg) => {
	it("addresses the other Asset Hub through its consensus, as the origin recorded it", () => {
		expect(getHopDestination(leg.hop)).toEqual(leg.sentTo);
		expect(isHopDestination(leg.sentTo, leg.hop)).toBe(true);
	});

	it("does not take its own Asset Hub or the Bridge Hub for the destination", () => {
		expect(isHopDestination(leg.sentTo, leg.back)).toBe(false);
		expect(isHopDestination(leg.forwardedTo.value, leg.hop)).toBe(false);
	});

	it("unwraps the message the origin exported through its Bridge Hub", () => {
		expect(leg.forwardedTo).toEqual(sibling(1002));
		expect(findHopMessage(leg.forwarded_xcms, leg.hop)).toEqual(leg.exported);
	});

	it("finds nothing in an export addressed to another consensus", () => {
		expect(findHopMessage(leg.forwarded_xcms, leg.back)).toBeUndefined();
	});

	it("rebuilds the message the destination executed from its Bridge Hub", () => {
		expect(getHopInbound(leg.hop, leg.exported)).toEqual(leg.inbound);
	});
});
