import { describe, expect, it } from "vitest";
import { getXcmDepositMatcher } from "../../../../utils/xcmDeposit";
import {
	afterFirstPoolSwap,
	type HopPath,
	type PoolHop,
	quoteAmmPath,
} from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import {
	composeXcmQuote,
	type DestinationDryRun,
	describeXcmQuoteFailure,
	parseDeliveryFee,
	parseDestinationDryRun,
	parseOriginDryRun,
} from "../xcm/xcmQuote";
import {
	getDestinationSwapFee,
	getDestinationSwapPlancksIn,
	getFeeSwap,
} from "./destinationSwapFee";
import {
	dotToUsdc,
	usdtToDot,
	usdtToPink,
	usdtToPinkDust,
	usdtToPinkExact,
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

const getSwapsExecuted = (dryRun: DestinationDryRun) =>
	dryRun.success
		? dryRun.value.emitted_events.flatMap((event) =>
				event.type === "AssetConversion" &&
				event.value.type === "SwapCreditExecuted"
					? [
							{
								amountIn: event.value.value.amount_in,
								amountOut: event.value.value.amount_out,
							},
						]
					: [],
			)
		: [];

const getPlancksIn = (fixture: XcmDestinationSwapFixture) => {
	const plancksIn = getDestinationSwapPlancksIn(
		fixture.amount,
		fixture.destinationFee,
	);
	if (!plancksIn.success) throw new Error("expected the fee to be covered");
	return plancksIn.value;
};

const quoteFixture = (
	fixture: XcmDestinationSwapFixture,
	slippage = fixture.slippage,
) => {
	const feeSwap = getFeeSwap(getRoute(fixture).path, fixture.destinationFee);
	return quoteAmmPath({
		hops: feeSwap
			? afterFirstPoolSwap(toPoolHops(fixture), feeSwap)
			: toPoolHops(fixture),
		lpFee: fixture.lpFee,
		plancksIn: getPlancksIn(fixture),
		slippage,
	});
};

const getDeposited = (
	{ destinationDryRun, beneficiary }: XcmDestinationSwapFixture,
	tokenId: string,
) => {
	if (!destinationDryRun.success) throw new Error("expected a dry run");
	const getDeposit = getXcmDepositMatcher({ tokenId, beneficiary });
	return destinationDryRun.value.emitted_events.reduce(
		(sum, event) => sum + getDeposit(event),
		0n,
	);
};

const hasTrappedAssets = ({ destinationDryRun }: XcmDestinationSwapFixture) =>
	destinationDryRun.success &&
	destinationDryRun.value.emitted_events.some(
		(event) =>
			event.type === "PolkadotXcm" && event.value.type === "AssetsTrapped",
	);

const successes = [
	["USDT to DOT", usdtToDot, 1],
	["USDT to PINK through DOT", usdtToPink, 2],
	["DOT to USDC", dotToUsdc, 1],
	["USDT to PINK at 0% slippage", usdtToPinkExact, 2],
] as const;

const nonNativeInputs = [
	["USDT to DOT", usdtToDot],
	["USDT to PINK through DOT", usdtToPink],
] as const;

describe("quoting a swap on Asset Hub of what Hydration sends", () => {
	it.each(successes)(
		"sends the whole amount of %s from Hydration",
		(_, fixture) => {
			const origin = parseOriginDryRun(fixture.originDryRun, ASSET_HUB_PARA_ID);
			if (!origin.success) throw new Error("expected the message to leave");

			expect(origin.value.sent).toBe(fixture.amount);
			expect(parseDeliveryFee(fixture.deliveryFees)).toBe(0n);
		},
	);

	it.each(nonNativeInputs)(
		"sees Asset Hub buy its fee for %s through the first pool before swapping",
		(_, fixture) => {
			const [feeSwap] = getSwapsExecuted(fixture.destinationDryRun);

			expect(feeSwap).toEqual({
				amountIn: fixture.destinationFee.plancks,
				amountOut: fixture.destinationFee.nativePlancks,
			});
		},
	);

	it.each(successes)(
		"prices the Asset Hub fee of %s in the input from the first pool, as Asset Hub does",
		(_, fixture) => {
			expect(
				getDestinationSwapFee(
					toPoolHops(fixture)[0],
					fixture.lpFee,
					fixture.destinationFee.nativePlancks,
				),
			).toEqual(fixture.destinationFee);
		},
	);

	it("cannot price a fee the first pool cannot pay", () => {
		const firstPool = toPoolHops(usdtToDot)[0];

		expect(
			getDestinationSwapFee(firstPool, usdtToDot.lpFee, firstPool.reserveOut),
		).toBeNull();
	});

	it("buys no fee swap when Asset Hub takes its fee in native", () => {
		expect(
			getFeeSwap(getRoute(dotToUsdc).path, dotToUsdc.destinationFee),
		).toBeNull();
		expect(getSwapsExecuted(dotToUsdc.destinationDryRun)).toHaveLength(1);
	});

	it.each(successes)(
		"quotes each hop of %s as Asset Hub executed it",
		(_, fixture, hopCount) => {
			const executed = getSwapsExecuted(fixture.destinationDryRun).slice(
				-hopCount,
			);

			expect(
				quoteFixture(fixture).hops.map(({ amountIn, amountOut }) => ({
					amountIn,
					amountOut,
				})),
			).toEqual(executed);
		},
	);

	it.each(nonNativeInputs)(
		"would promise more of %s than Asset Hub delivers if it ignored the fee swap",
		(_, fixture) => {
			const ignoringFeeSwap = quoteAmmPath({
				hops: toPoolHops(fixture),
				lpFee: fixture.lpFee,
				plancksIn: getPlancksIn(fixture),
				slippage: 0,
			});
			const [, firstHop] = getSwapsExecuted(fixture.destinationDryRun);

			expect(ignoringFeeSwap.hops[0].amountOut).toBeGreaterThan(
				firstHop?.amountOut ?? 0n,
			);
		},
	);

	it.each(successes)(
		"asks Asset Hub for the minimums of its own quote of %s",
		(_, fixture) => {
			expect(quoteFixture(fixture).hops.map(({ minOut }) => minOut)).toEqual(
				fixture.hops.map(({ minOut }) => minOut),
			);
		},
	);

	it("lets a swap at 0% slippage through when the price has not moved", () => {
		const quote = quoteFixture(usdtToPinkExact, 0);
		const executed = getSwapsExecuted(usdtToPinkExact.destinationDryRun).slice(
			-2,
		);

		expect(usdtToPinkExact.slippage).toBe(0);
		expect(quote.hops.map(({ minOut }) => minOut)).toEqual(
			executed.map(({ amountOut }) => amountOut),
		);
		expect(
			parseDestinationDryRun(usdtToPinkExact.destinationDryRun, {
				tokenId: usdtToPinkExact.tokenIdOut,
				beneficiary: usdtToPinkExact.beneficiary,
			}),
		).toEqual({ success: true, value: quote.minOut });
	});

	it.each(successes)(
		"quotes the %s output deposited on Asset Hub and the fee taken from the input",
		(_, fixture) => {
			const route = getRoute(fixture);
			const destinationFee = {
				tokenId: route.path[0].tokenIdIn,
				plancks: fixture.destinationFee.plancks,
			};
			const received = quoteFixture(fixture).amountOut;

			expect(
				parseDestinationDryRun(fixture.destinationDryRun, {
					tokenId: fixture.tokenIdOut,
					beneficiary: fixture.beneficiary,
				}),
			).toEqual({ success: true, value: received });
			expect(
				composeXcmQuote(
					{ route, destinationFee },
					{ sent: fixture.amount, received },
				),
			).toEqual({ received, destinationFee });
		},
	);

	it("refuses an amount the Asset Hub fee would eat", () => {
		expect(
			getDestinationSwapPlancksIn(
				usdtToDot.destinationFee.plancks,
				usdtToDot.destinationFee,
			),
		).toEqual({
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

	it("returns everything a failed swap held, the unused fee included, to the beneficiary", () => {
		const [, firstHop, refund] = getSwapsExecuted(
			usdtToPinkPriceMoved.destinationDryRun,
		);

		expect(getDeposited(usdtToPinkPriceMoved, DOT)).toBe(firstHop?.amountOut);
		expect(getDeposited(usdtToPinkPriceMoved, USDT)).toBe(refund?.amountOut);
		expect(getDeposited(usdtToPinkPriceMoved, USDT)).toBeGreaterThan(0n);
		expect(hasTrappedAssets(usdtToPinkPriceMoved)).toBe(false);
	});

	it("still returns the swapped DOT when the unused fee is dust the beneficiary cannot hold", () => {
		const [, firstHop] = getSwapsExecuted(usdtToPinkDust.destinationDryRun);

		expect(getDeposited(usdtToPinkDust, DOT)).toBe(firstHop?.amountOut);
		expect(getDeposited(usdtToPinkDust, USDT)).toBe(0n);
		expect(hasTrappedAssets(usdtToPinkDust)).toBe(true);
	});
});
