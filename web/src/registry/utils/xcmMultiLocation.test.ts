import { describe, expect, it } from "vitest";
import { getXcmV5MultilocationFromTokenId } from "./xcmMultiLocation";

const RELAY_TOKEN = { parents: 1, interior: { type: "Here" } };

describe("getXcmV5MultilocationFromTokenId", () => {
	it.each(["native::pah", "native::ppeople"])(
		"locates %s, whose native token is the relay token",
		(tokenId) => {
			expect(getXcmV5MultilocationFromTokenId(tokenId)).toEqual(RELAY_TOKEN);
		},
	);

	it("locates an Asset Hub asset in the assets pallet", () => {
		expect(getXcmV5MultilocationFromTokenId("asset::pah::1984")).toEqual({
			parents: 0,
			interior: {
				type: "X2",
				value: [
					{ type: "PalletInstance", value: 50 },
					{ type: "GeneralIndex", value: 1984n },
				],
			},
		});
	});

	it.each(["native::hydration", "hydration-asset::hydration::5"])(
		"refuses %s rather than locating it on Asset Hub",
		(tokenId) => {
			expect(() => getXcmV5MultilocationFromTokenId(tokenId)).toThrow(
				`No Asset Hub location for ${tokenId}`,
			);
		},
	);
});
