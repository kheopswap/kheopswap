import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP, TOKENS_OVERRIDES_MAP } from "./tokens";

describe("KNOWN_TOKENS_MAP", () => {
	it("restores bigints in generated hydration asset locations", () => {
		expect(KNOWN_TOKENS_MAP["hydration-asset::hydration::10"]).toMatchObject({
			location: {
				parents: 1,
				interior: {
					type: "X3",
					value: [
						{ type: "Parachain", value: 1000 },
						{ type: "PalletInstance", value: 50 },
						{ type: "GeneralIndex", value: 1984n },
					],
				},
			},
		});
	});
});

describe("TOKENS_OVERRIDES_MAP", () => {
	it.each([
		"asset::pah::1337",
		"asset::pah::1984",
		"asset::pasah::1337",
		"asset::pasah::1984",
	] as const)("verifies the stable asset %s", (tokenId) => {
		expect(KNOWN_TOKENS_MAP[tokenId]).toBeDefined();
		expect(TOKENS_OVERRIDES_MAP[tokenId]?.verified).toBe(true);
	});
});
