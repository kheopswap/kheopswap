import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
} from "@polkadot-api/descriptors";
import { describe, expect, it } from "vitest";
import type { TxEvents } from "../../../../utils/getErrorMessageFromTxEvents";
import {
	findHopMessage,
	getHopDestination,
	getHopInbound,
	isHopDestination,
} from "./xcmHop";
import { dotPeopleToHydration } from "./xcmHubTransfer.fixtures";

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
