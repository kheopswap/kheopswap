import { describe, expect, it } from "vitest";
import { getChains } from "../../../registry/chains/chains";
import { getXcmTransferType, isXcmLane } from "./xcmLanes";

describe("xcm lanes", () => {
	it("joins exactly Polkadot Asset Hub and Hydration, both ways", () => {
		const chainIds = getChains().map((chain) => chain.id);
		const pairs = chainIds.flatMap((origin) =>
			chainIds.map((destination) => ({ origin, destination })),
		);
		expect(pairs.filter(isXcmLane)).toEqual([
			{ origin: "pah", destination: "hydration" },
			{ origin: "hydration", destination: "pah" },
		]);
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
