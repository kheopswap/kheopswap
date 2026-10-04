import { describe, expect, it } from "vitest";
import type { OriginDryRun } from "../xcm/xcmQuote";
import { type AmmPath, getAmmPath, quoteAmmPath } from "./ammPath";
import { dotToUsdt, usdcToUsdt } from "./xcmSwap.fixtures";

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";

const getSwapAmountsOut = (origin: OriginDryRun) =>
	origin.success
		? origin.value.emitted_events.flatMap((event) =>
				event.type === "AssetConversion" &&
				event.value.type === "SwapCreditExecuted"
					? [event.value.value.amount_out]
					: [],
			)
		: [];

describe("getAmmPath", () => {
	it.each([
		["from native", DOT, USDT],
		["to native", USDT, DOT],
	])("swaps %s in one hop", (_, tokenIdIn, tokenIdOut) => {
		expect(getAmmPath(tokenIdIn, tokenIdOut, DOT)).toEqual([
			{ tokenIdIn, tokenIdOut },
		]);
	});

	it("swaps two assets through native", () => {
		expect(getAmmPath(USDC, USDT, DOT)).toEqual([
			{ tokenIdIn: USDC, tokenIdOut: DOT },
			{ tokenIdIn: DOT, tokenIdOut: USDT },
		]);
	});
});

describe("quoteAmmPath", () => {
	it.each([
		["USDC to USDT through DOT", usdcToUsdt, getAmmPath(USDC, USDT, DOT)],
		["DOT to USDT", dotToUsdt, getAmmPath(DOT, USDT, DOT)],
	] as const)(
		"matches what Asset Hub swapped and the probe's minimums for %s",
		(_, fixture, path: AmmPath) => {
			const hops = path.map((hop, i) => {
				const reserves = fixture.reserves[i];
				if (!reserves) throw new Error("fixture lacks reserves for a hop");
				return { ...hop, reserveIn: reserves[0], reserveOut: reserves[1] };
			});
			const [first, second] = hops;
			if (!first) throw new Error("empty path");

			const quote = quoteAmmPath({
				hops: second ? [first, second] : [first],
				lpFee: fixture.lpFee,
				plancksIn: fixture.swapAmount,
				slippage: Number(fixture.slippageBps) / 10_000,
			});

			expect(quote.hops.map(({ amountOut }) => amountOut)).toEqual(
				getSwapAmountsOut(fixture.origin),
			);
			expect(quote.hops.map(({ minOut }) => minOut)).toEqual(fixture.mins);
			expect(quote.hops[0].amountIn).toBe(fixture.swapAmount);
			expect(quote.amountOut).toBe(quote.hops.at(-1)?.amountOut);
			expect(quote.minOut).toBe(fixture.mins.at(-1));
		},
	);
});
