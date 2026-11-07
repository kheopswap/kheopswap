import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "./tokens";

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

	it("shows Hydration assets with the logo of their Asset Hub counterpart", () => {
		expect(KNOWN_TOKENS_MAP["hydration-asset::hydration::5"]).toMatchObject({
			logo: "./img/tokens/DOT.svg",
			verified: true,
		});
		expect(KNOWN_TOKENS_MAP["hydration-asset::hydration::10"]).toMatchObject({
			logo: "./img/tokens/USDT.webp",
			verified: true,
		});
		expect(KNOWN_TOKENS_MAP["hydration-asset::hydration::22"]).toMatchObject({
			logo: "./img/tokens/USDC.webp",
			verified: true,
		});
	});
});
