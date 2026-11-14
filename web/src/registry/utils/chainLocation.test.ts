import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import { describe, expect, it } from "vitest";
import { getChainById } from "../chains/chains";
import { getTokenId } from "../tokens/helpers";
import { KNOWN_TOKENS_MAP } from "../tokens/tokens";
import type { XcmV5Multilocation } from "../types/xcm";
import {
	getChainLocation,
	getNetworkRelayId,
	reanchorLocation,
} from "./chainLocation";

const pah = getChainById("pah");
const kah = getChainById("kah");
const wah = getChainById("wah");
const hydration = getChainById("hydration");
const ppeople = getChainById("ppeople");
const wpeople = getChainById("wpeople");

const RELAY_TOKEN: XcmV5Multilocation = {
	parents: 1,
	interior: XcmV5Junctions.Here(),
};

const USDT_IN_PAH: XcmV5Multilocation = {
	parents: 0,
	interior: XcmV5Junctions.X2([
		XcmV5Junction.PalletInstance(50),
		XcmV5Junction.GeneralIndex(1984n),
	]),
};

const ETHEREUM_ERC20: XcmV5Multilocation = {
	parents: 2,
	interior: XcmV5Junctions.X2([
		XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Ethereum({ chain_id: 1n })),
		XcmV5Junction.AccountKey20({
			network: undefined,
			key: "0xdac17f958d2ee523a2206206994597c13d831ec7",
		}),
	]),
};

describe("getChainLocation", () => {
	it("locates a chain as its own interior", () => {
		expect(getChainLocation({ from: pah, to: pah })).toEqual({
			parents: 0,
			interior: XcmV5Junctions.Here(),
		});
	});

	it("locates a sibling parachain", () => {
		expect(getChainLocation({ from: pah, to: hydration })).toEqual({
			parents: 1,
			interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(2034)),
		});
	});

	it.each([
		[pah, kah, XcmV5NetworkId.Kusama()],
		[kah, pah, XcmV5NetworkId.Polkadot()],
	])("locates a parachain of another relay", (from, to, network) => {
		expect(getChainLocation({ from, to })).toEqual({
			parents: 2,
			interior: XcmV5Junctions.X2([
				XcmV5Junction.GlobalConsensus(network),
				XcmV5Junction.Parachain(1000),
			]),
		});
	});

	it("cannot locate a chain of a relay without a network id", () => {
		expect(getChainLocation({ from: pah, to: wah })).toBeUndefined();
	});

	it("locates a sibling on a relay without a network id", () => {
		expect(getChainLocation({ from: wah, to: wpeople })).toEqual({
			parents: 1,
			interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(1004)),
		});
	});
});

describe("reanchorLocation", () => {
	it("prefixes an interior location with its parachain for a sibling", () => {
		expect(reanchorLocation(USDT_IN_PAH, { from: pah, to: hydration })).toEqual(
			{
				parents: 1,
				interior: XcmV5Junctions.X3([
					XcmV5Junction.Parachain(1000),
					XcmV5Junction.PalletInstance(50),
					XcmV5Junction.GeneralIndex(1984n),
				]),
			},
		);
	});

	it("prefixes an interior location with its consensus across relays", () => {
		const location = reanchorLocation(USDT_IN_PAH, { from: pah, to: kah });
		expect(location).toEqual({
			parents: 2,
			interior: XcmV5Junctions.X4([
				XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Polkadot()),
				XcmV5Junction.Parachain(1000),
				XcmV5Junction.PalletInstance(50),
				XcmV5Junction.GeneralIndex(1984n),
			]),
		});
		expect(
			location &&
				KNOWN_TOKENS_MAP[
					getTokenId({ type: "foreign-asset", chainId: "kah", location })
				]?.symbol,
		).toBe("USDt");
	});

	it("keeps the relay token between siblings", () => {
		expect(reanchorLocation(RELAY_TOKEN, { from: ppeople, to: pah })).toEqual(
			RELAY_TOKEN,
		);
	});

	it.each([
		[kah, pah, XcmV5NetworkId.Kusama()],
		[pah, kah, XcmV5NetworkId.Polkadot()],
	])(
		"names the relay token by its consensus across relays",
		(from, to, network) => {
			expect(reanchorLocation(RELAY_TOKEN, { from, to })).toEqual({
				parents: 2,
				interior: XcmV5Junctions.X1(XcmV5Junction.GlobalConsensus(network)),
			});
		},
	);

	it("turns a sibling location into an interior one at its parachain", () => {
		expect(
			reanchorLocation(
				{
					parents: 1,
					interior: XcmV5Junctions.X3([
						XcmV5Junction.Parachain(1000),
						XcmV5Junction.PalletInstance(50),
						XcmV5Junction.GeneralIndex(1984n),
					]),
				},
				{ from: hydration, to: pah },
			),
		).toEqual(USDT_IN_PAH);
	});

	it("keeps a location of a third sibling", () => {
		const location: XcmV5Multilocation = {
			parents: 1,
			interior: XcmV5Junctions.X2([
				XcmV5Junction.Parachain(2034),
				XcmV5Junction.GeneralIndex(0n),
			]),
		};
		expect(reanchorLocation(location, { from: ppeople, to: pah })).toEqual(
			location,
		);
	});

	it.each([
		[
			XcmV5Junctions.X1(
				XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Polkadot()),
			),
			RELAY_TOKEN,
		],
		[
			XcmV5Junctions.X4([
				XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Polkadot()),
				XcmV5Junction.Parachain(1000),
				XcmV5Junction.PalletInstance(50),
				XcmV5Junction.GeneralIndex(1984n),
			]),
			USDT_IN_PAH,
		],
	])("drops the consensus of the destination relay", (interior, expected) => {
		expect(
			reanchorLocation({ parents: 2, interior }, { from: kah, to: pah }),
		).toEqual(expected);
	});

	it("keeps a location of a third consensus", () => {
		expect(reanchorLocation(ETHEREUM_ERC20, { from: pah, to: kah })).toEqual(
			ETHEREUM_ERC20,
		);
	});

	it("round trips across relays", () => {
		const there = reanchorLocation(USDT_IN_PAH, { from: pah, to: kah });
		expect(there && reanchorLocation(there, { from: kah, to: pah })).toEqual(
			USDT_IN_PAH,
		);
	});

	it("cannot reanchor from a relay without a network id", () => {
		expect(
			reanchorLocation(RELAY_TOKEN, { from: wah, to: pah }),
		).toBeUndefined();
	});

	it("reanchors into a relay without a network id", () => {
		expect(reanchorLocation(RELAY_TOKEN, { from: pah, to: wah })).toEqual({
			parents: 2,
			interior: XcmV5Junctions.X1(
				XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Polkadot()),
			),
		});
	});

	it("rejects a location above the global consensus", () => {
		expect(
			reanchorLocation(
				{ parents: 3, interior: XcmV5Junctions.Here() },
				{ from: pah, to: kah },
			),
		).toBeUndefined();
	});
});

describe("getNetworkRelayId", () => {
	it.each([
		[XcmV5NetworkId.Polkadot(), "polkadot"],
		[XcmV5NetworkId.Kusama(), "kusama"],
		[XcmV5NetworkId.Ethereum({ chain_id: 1n }), undefined],
	])("maps %o to %s", (network, relayId) => {
		expect(getNetworkRelayId(network)).toBe(relayId);
	});
});
