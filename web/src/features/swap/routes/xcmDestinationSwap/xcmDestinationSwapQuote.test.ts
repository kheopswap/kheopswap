import { describe, expect, it } from "vitest";
import { getXcmDepositMatcher } from "../../../../utils/xcmDeposit";
import { type HopPath, type PoolHop, quoteAmmPath } from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import {
	composeXcmQuote,
	describeXcmQuoteFailure,
	getDestinationSwapPlancksIn,
	parseDeliveryFee,
	parseDestinationDryRun,
	parseOriginDryRun,
} from "../xcm/xcmQuote";
import {
	dotToUsdc,
	usdtToDot,
	usdtToPink,
	usdtToPinkPriceMoved,
	type XcmDestinationSwapFixture,
} from "./xcmDestinationSwap.fixtures";

const ASSET_HUB_PARA_ID = 1000;
const DOT = "native::pah";
const USDT = "asset::pah::1984";

const toHopPath = <T>([first, second]: readonly T[]): HopPath<T> => {
	if (!first) throw new Error("expected at least one hop");
	return second ? [first, second] : [first];
};

const toPoolHops = ({ hops }: XcmDestinationSwapFixture): HopPath<PoolHop> =>
	toHopPath(
		hops.map(({ tokenIdIn, tokenIdOut, reserveIn, reserveOut }) => ({
			tokenIdIn,
			tokenIdOut,
			reserveIn,
			reserveOut,
		})),
	);

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
	path: toHopPath(
		hops.map(({ tokenIdIn, tokenIdOut }) => ({ tokenIdIn, tokenIdOut })),
	),
});

const successes = [
	["USDT to DOT", usdtToDot, 93836030456n],
	["USDT to PINK through DOT", usdtToPink, 497686228859862n],
	["DOT to USDC", dotToUsdc, 1057352n],
] as const;

describe("quoting a swap on Asset Hub of what Hydration sends", () => {
	it.each(successes)(
		"swaps what is left of %s after the Asset Hub fee",
		(_, fixture) => {
			const origin = parseOriginDryRun(fixture.originDryRun, ASSET_HUB_PARA_ID);
			if (!origin.success) throw new Error("expected the message to leave");

			expect(origin.value.sent).toBe(fixture.amount);
			expect(
				getDestinationSwapPlancksIn(origin.value.sent, fixture.destinationFee),
			).toEqual({ success: true, value: fixture.hops[0]?.amountIn });
		},
	);

	it.each(successes)(
		"asks Asset Hub for the same minimums as its own quote of %s",
		(_, fixture) => {
			const quote = quoteAmmPath({
				hops: toPoolHops(fixture),
				lpFee: fixture.lpFee,
				plancksIn: fixture.amount - fixture.destinationFee,
				slippage: fixture.slippage,
			});

			expect(
				quote.hops.map(({ amountOut, minOut }) => ({ amountOut, minOut })),
			).toEqual(
				fixture.hops.map(({ amountOut, minOut }) => ({ amountOut, minOut })),
			);
		},
	);

	it.each(successes)(
		"quotes the %s output deposited on Asset Hub and the fee taken from the input",
		(_, fixture, received) => {
			const parsed = parseDestinationDryRun(fixture.destinationDryRun, {
				tokenId: fixture.tokenIdOut,
				beneficiary: fixture.beneficiary,
			});
			expect(parsed).toEqual({ success: true, value: received });
			expect(parseDeliveryFee(fixture.deliveryFees)).toBe(0n);
			expect(
				composeXcmQuote(getRoute(fixture), {
					sent: fixture.amount,
					received,
					destinationSwapFee: fixture.destinationFee,
				}),
			).toEqual({
				received,
				destinationFee: {
					tokenId: fixture.hops[0]?.tokenIdIn,
					plancks: fixture.destinationFee,
				},
			});
		},
	);

	it("waits for the Asset Hub fee before quoting", () => {
		expect(
			composeXcmQuote(getRoute(usdtToDot), {
				sent: usdtToDot.amount,
				received: 93836030456n,
				destinationSwapFee: undefined,
			}),
		).toBeUndefined();
	});

	it("refuses an amount the Asset Hub fee would eat", () => {
		expect(getDestinationSwapPlancksIn(1531n, 1531n)).toEqual({
			success: false,
			failure: { kind: "below-destination-fee" },
		});
		expect(
			describeXcmQuoteFailure(
				{ kind: "below-destination-fee" },
				getRoute(usdtToDot),
			),
		).toBe("Amount too low to cover the Polkadot Asset Hub fee");
	});

	it("reports a price move when Asset Hub cannot meet the minimum", () => {
		const parsed = parseDestinationDryRun(
			usdtToPinkPriceMoved.destinationDryRun,
			{
				tokenId: usdtToPinkPriceMoved.tokenIdOut,
				beneficiary: usdtToPinkPriceMoved.beneficiary,
			},
		);
		expect(parsed).toEqual({
			success: false,
			failure: { kind: "destination-price-moved" },
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(
			describeXcmQuoteFailure(parsed.failure, getRoute(usdtToPinkPriceMoved)),
		).toBe(
			"The price moved beyond your slippage tolerance on Polkadot Asset Hub",
		);
	});

	it("leaves what the failed swap held in the beneficiary's Asset Hub account", () => {
		const { destinationDryRun, beneficiary, hops } = usdtToPinkPriceMoved;
		if (!destinationDryRun.success) throw new Error("expected a dry run");
		const deposited = (tokenId: string) => {
			const getDeposit = getXcmDepositMatcher({ tokenId, beneficiary });
			return destinationDryRun.value.emitted_events.reduce(
				(sum, event) => sum + getDeposit(event),
				0n,
			);
		};

		expect(deposited(DOT)).toBeGreaterThanOrEqual((hops[0]?.minOut ?? 0n) - 1n);
		expect(deposited(DOT)).toBeLessThanOrEqual(hops[0]?.amountOut ?? 0n);
		expect(deposited(USDT)).toBe(0n);
		expect(deposited(usdtToPinkPriceMoved.tokenIdOut)).toBe(0n);
	});
});
