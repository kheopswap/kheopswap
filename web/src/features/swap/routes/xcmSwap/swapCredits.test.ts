import { describe, expect, it } from "vitest";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { TxEvents } from "../../../../utils/getErrorMessageFromTxEvents";
import { getAmmPath } from "./ammPath";
import { matchSwapHops } from "./swapCredits";
import { usdcToUsdt } from "./xcmSwap.fixtures";

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";

const path = getAmmPath(USDC, USDT, DOT);

const originEvents: TxEvents = usdcToUsdt.origin.success
	? usdcToUsdt.origin.value.emitted_events
	: [];

const swapCredit = (
	tokenIdIn: string,
	tokenIdOut: string,
	amountIn: bigint,
	amountOut: bigint,
): TxEvents[number] => ({
	type: "AssetConversion",
	value: {
		type: "SwapCreditExecuted",
		value: {
			amount_in: amountIn,
			amount_out: amountOut,
			path: [
				[getXcmV5MultilocationFromTokenId(tokenIdIn), amountIn],
				[getXcmV5MultilocationFromTokenId(tokenIdOut), amountOut],
			],
		},
	},
});

const ourHops = [
	{
		tokenIdIn: USDC,
		tokenIdOut: DOT,
		amountIn: 99_700_000n,
		amountOut: 833_320_443_826n,
	},
	{
		tokenIdIn: DOT,
		tokenIdOut: USDT,
		amountIn: 833_320_443_826n,
		amountOut: 98_765_199n,
	},
];

describe("matchSwapHops", () => {
	it("reads each hop of the swap Asset Hub executed", () => {
		expect(matchSwapHops(originEvents, path, usdcToUsdt.swapAmount)).toEqual(
			ourHops,
		);
	});

	it("skips a fee payment swap of the same amount between other tokens", () => {
		const feeSwap = swapCredit(USDT, DOT, usdcToUsdt.swapAmount, 1_234n);
		expect(
			matchSwapHops([feeSwap, ...originEvents], path, usdcToUsdt.swapAmount),
		).toEqual(ourHops);
	});

	it("skips a fee payment swap of the same tokens and another amount", () => {
		const feeSwap = swapCredit(USDC, DOT, 5_000n, 41_000_000n);
		expect(
			matchSwapHops([feeSwap, ...originEvents], path, usdcToUsdt.swapAmount),
		).toEqual(ourHops);
	});

	it("finds nothing when a hop is missing", () => {
		const [firstHop] = originEvents.filter(
			(event) => event.value.type === "SwapCreditExecuted",
		);
		if (!firstHop) throw new Error("fixture has no swap");
		expect(matchSwapHops([firstHop], path, usdcToUsdt.swapAmount)).toBeNull();
	});
});
