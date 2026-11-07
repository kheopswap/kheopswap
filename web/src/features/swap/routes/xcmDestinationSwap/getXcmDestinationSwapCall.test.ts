import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import { type AmmPath, getAmmPath, mapHopPath } from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import { buildXcmDestinationSwapArgs } from "./getXcmDestinationSwapCall";
import {
	dotToUsdc,
	usdtToDot,
	usdtToPink,
	type XcmDestinationSwapFixture,
} from "./xcmDestinationSwap.fixtures";

const getRoute = ({
	tokenIdIn,
	tokenIdOut,
	hops,
}: XcmDestinationSwapFixture): XcmDestinationSwapRoute => ({
	kind: "xcm-destination-swap",
	origin: "hydration",
	destination: "pah",
	tokenIdIn,
	tokenIdOut,
	path: getAmmPath(hops[0]?.tokenIdIn ?? "", tokenIdOut, "native::pah"),
});

describe("buildXcmDestinationSwapArgs", () => {
	it.each([
		["USDT to DOT in one hop", usdtToDot],
		["USDT to PINK through DOT", usdtToPink],
		["DOT to USDC in one hop", dotToUsdc],
	])(
		"builds the call captured from a successful dry run of %s",
		(_, fixture) => {
			const route = getRoute(fixture);
			const tokenIn = KNOWN_TOKENS_MAP[fixture.tokenIdIn];
			if (!tokenIn) throw new Error(`unknown token ${fixture.tokenIdIn}`);
			const minOuts = fixture.hops.map(({ minOut }) => minOut);

			expect(
				buildXcmDestinationSwapArgs({
					route,
					tokenIn,
					plancks: fixture.amount,
					hops: mapHopPath(route.path as AmmPath, (hop, index) => ({
						...hop,
						minOut: minOuts[index] ?? 0n,
					})),
					beneficiary: fixture.beneficiary,
				}),
			).toEqual(fixture.args);
		},
	);
});
