import { isEqual } from "lodash-es";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { TxEvents } from "../../../../utils/getErrorMessageFromTxEvents";
import type { AmmHop, AmmPath } from "./ammPath";

type SwapCredit = {
	amountIn: bigint;
	amountOut: bigint;
	locationIn: XcmV5Multilocation | undefined;
	locationOut: XcmV5Multilocation | undefined;
};

type SwapCreditExecuted = {
	amount_in: bigint;
	amount_out: bigint;
	path: [XcmV5Multilocation, bigint][];
};

export type ExecutedHop = AmmHop & { amountIn: bigint; amountOut: bigint };

const getSwapCredits = (events: TxEvents): SwapCredit[] =>
	events.flatMap(({ type, value }) => {
		if (type !== "AssetConversion" || value.type !== "SwapCreditExecuted")
			return [];
		const { amount_in, amount_out, path } = value.value as SwapCreditExecuted;
		return [
			{
				amountIn: amount_in,
				amountOut: amount_out,
				locationIn: path[0]?.[0],
				locationOut: path.at(-1)?.[0],
			},
		];
	});

// The fee-asset transaction payment also swaps through AssetConversion, so our
// hops are the credits whose input chains from the amount we swapped.
export const matchSwapHops = (
	events: TxEvents,
	path: AmmPath,
	swapPlancksIn: bigint,
): ExecutedHop[] | null => {
	const credits = getSwapCredits(events);
	const hops: ExecutedHop[] = [];
	let amountIn = swapPlancksIn;
	let from = 0;

	for (const hop of path) {
		const locationIn = getXcmV5MultilocationFromTokenId(hop.tokenIdIn);
		const locationOut = getXcmV5MultilocationFromTokenId(hop.tokenIdOut);
		const index = credits.findIndex(
			(credit, i) =>
				i >= from &&
				credit.amountIn === amountIn &&
				isEqual(credit.locationIn, locationIn) &&
				isEqual(credit.locationOut, locationOut),
		);
		const credit = credits[index];
		if (!credit) return null;

		hops.push({ ...hop, amountIn, amountOut: credit.amountOut });
		amountIn = credit.amountOut;
		from = index + 1;
	}

	return hops;
};
