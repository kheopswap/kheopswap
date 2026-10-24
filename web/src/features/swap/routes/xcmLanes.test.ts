import { describe, expect, it } from "vitest";
import { getChains } from "../../../registry/chains/chains";
import { getXcmTransferType, isXcmLane } from "./xcmLanes";

describe("xcm lanes", () => {
	it("joins Polkadot Asset Hub and Hydration both ways, and each Asset Hub to its People chain", () => {
		const chainIds = getChains().map((chain) => chain.id);
		const pairs = chainIds.flatMap((origin) =>
			chainIds.map((destination) => ({ origin, destination })),
		);
		expect(pairs.filter(isXcmLane)).toEqual([
			{ origin: "pah", destination: "hydration" },
			{ origin: "pah", destination: "ppeople" },
			{ origin: "kah", destination: "kpeople" },
			{ origin: "wah", destination: "wpeople" },
			{ origin: "pasah", destination: "paspeople" },
			{ origin: "hydration", destination: "pah" },
		]);
	});

	it.each([
		{ origin: "pah", destination: "ppeople" },
		{ origin: "kah", destination: "kpeople" },
		{ origin: "wah", destination: "wpeople" },
		{ origin: "pasah", destination: "paspeople" },
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
});
