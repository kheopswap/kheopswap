import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { XcmSwapRoute } from "../swapRoute";
import { getAmmPath, mapHopPath } from "./ammPath";
import { buildXcmSwapMessage } from "./getXcmSwapCall";
import { dotToUsdt, dotToUsdtTrapped, usdcToUsdt } from "./xcmSwap.fixtures";

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";
const HYDRATION_USDT = "hydration-asset::hydration::10";

const hydrationUsdt = KNOWN_TOKENS_MAP[HYDRATION_USDT];
if (hydrationUsdt?.type !== "hydration-asset" || !hydrationUsdt.location)
	throw new Error("Hydration USDT has no location");
const remoteFeeLocation = hydrationUsdt.location;

const getRoute = (tokenIdIn: string): XcmSwapRoute => ({
	kind: "xcm-swap",
	origin: "pah",
	destination: "hydration",
	tokenIdIn,
	tokenIdOut: HYDRATION_USDT,
	path: getAmmPath(tokenIdIn, USDT, DOT),
});

const withMins = (route: XcmSwapRoute, mins: bigint[]) =>
	mapHopPath(route.path, (hop, index) => ({
		...hop,
		minOut: mins[index] ?? 0n,
	}));

describe("buildXcmSwapMessage", () => {
	it.each([
		["a two-hop swap", USDC, usdcToUsdt],
		["a one-hop swap", DOT, dotToUsdt],
	])(
		"builds the message the probe executed for %s",
		(_, tokenIdIn, fixture) => {
			const route = getRoute(tokenIdIn);
			expect(
				buildXcmSwapMessage({
					route,
					swapPlancksIn: fixture.swapAmount,
					hops: withMins(route, fixture.mins),
					remoteFeeLocation,
					beneficiary: fixture.sender,
				}),
			).toEqual(fixture.program);
		},
	);

	it("raises zero minimums to one plank, which the weight query accepts", () => {
		const route = getRoute(DOT);
		expect(
			buildXcmSwapMessage({
				route,
				swapPlancksIn: dotToUsdtTrapped.swapAmount,
				hops: withMins(route, [0n]),
				remoteFeeLocation,
				beneficiary: dotToUsdtTrapped.sender,
			}),
		).toEqual(dotToUsdtTrapped.program);
		expect(dotToUsdtTrapped.mins).toEqual([1n]);
	});
});
