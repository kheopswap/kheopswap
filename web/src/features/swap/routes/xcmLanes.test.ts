import { describe, expect, it } from "vitest";
import {
	getBridgedAssetHub,
	getChains,
	isChainIdAssetHub,
} from "../../../registry/chains/chains";
import { DOT_ON_KAH, KSM_ON_PAH } from "./xcm/xcmBridge.fixtures";
import { getXcmTransferType, isBridgeLane, isXcmLane } from "./xcmLanes";

const chainIds = getChains().map((chain) => chain.id);
const pairs = chainIds.flatMap((origin) =>
	chainIds.map((destination) => ({ origin, destination })),
);

describe("xcm lanes", () => {
	it("joins Polkadot Asset Hub and Hydration both ways, each Asset Hub to its People chain, back from all but Paseo People, and the Polkadot and Kusama Asset Hubs both ways", () => {
		expect(pairs.filter(isXcmLane)).toEqual([
			{ origin: "pah", destination: "kah" },
			{ origin: "pah", destination: "hydration" },
			{ origin: "pah", destination: "ppeople" },
			{ origin: "kah", destination: "pah" },
			{ origin: "kah", destination: "kpeople" },
			{ origin: "wah", destination: "wpeople" },
			{ origin: "pasah", destination: "paspeople" },
			{ origin: "hydration", destination: "pah" },
			{ origin: "ppeople", destination: "pah" },
			{ origin: "kpeople", destination: "kah" },
			{ origin: "wpeople", destination: "wah" },
		]);
	});

	it.each([
		{ origin: "pah", destination: "ppeople" },
		{ origin: "kah", destination: "kpeople" },
		{ origin: "wah", destination: "wpeople" },
		{ origin: "pasah", destination: "paspeople" },
		{ origin: "ppeople", destination: "pah" },
		{ origin: "kpeople", destination: "kah" },
		{ origin: "wpeople", destination: "wah" },
	] as const)("teleports from $origin to $destination", (lane) => {
		expect(getXcmTransferType(lane)).toBe("Teleport");
	});

	it("sends from Asset Hub to Hydration with Asset Hub as the reserve", () => {
		const lane = { origin: "pah", destination: "hydration" } as const;
		expect(getXcmTransferType(lane)).toBe("LocalReserve");
	});

	it("sends from Hydration to Asset Hub with Asset Hub as the reserve", () => {
		const lane = { origin: "hydration", destination: "pah" } as const;
		expect(getXcmTransferType(lane)).toBe("DestinationReserve");
	});

	it("bridges exactly the Asset Hubs the registry pairs", () => {
		expect(pairs.filter(isBridgeLane)).toEqual(
			pairs.filter(
				({ origin, destination }) =>
					isChainIdAssetHub(origin) &&
					getBridgedAssetHub(origin)?.id === destination,
			),
		);
	});

	it.each([
		{ lane: { origin: "pah", destination: "kah" }, bridgedTokenId: KSM_ON_PAH },
		{ lane: { origin: "kah", destination: "pah" }, bridgedTokenId: DOT_ON_KAH },
	] as const)(
		"bridges the native token of $lane.origin with $lane.origin as the reserve, and the token bridged from $lane.destination with $lane.destination as the reserve",
		({ lane, bridgedTokenId }) => {
			expect(getXcmTransferType(lane, `native::${lane.origin}`)).toBe(
				"LocalReserve",
			);
			expect(getXcmTransferType(lane, bridgedTokenId)).toBe(
				"DestinationReserve",
			);
		},
	);
});
