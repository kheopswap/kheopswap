import { inputToPlancks, plancksToTokens } from "../../utils/plancks";
import type { Side } from "./maxLiquidity";

export type LiquidityAmounts = readonly [string, string];

export const NO_LIQUIDITY_AMOUNTS: LiquidityAmounts = ["", ""];

type Decimals = readonly [number, number];

export const pairLiquidityAmount = ({
	side,
	text,
	reserves,
	decimals,
}: {
	side: Side;
	text: string;
	reserves: readonly [bigint, bigint];
	decimals: Decimals;
}): LiquidityAmounts => {
	if (!text) return NO_LIQUIDITY_AMOUNTS;
	const other = side === 0 ? 1 : 0;
	const pairedPlancks =
		(inputToPlancks(text, decimals[side]) * reserves[other]) / reserves[side];
	const amounts: [string, string] = ["", ""];
	amounts[side] = text;
	amounts[other] = plancksToTokens(pairedPlancks, decimals[other]);
	return amounts;
};

export const getLiquidityToAdd = (
	amounts: LiquidityAmounts,
	decimals: Decimals,
): [bigint, bigint] | null =>
	amounts.every((amount) => !amount)
		? null
		: [
				inputToPlancks(amounts[0], decimals[0]),
				inputToPlancks(amounts[1], decimals[1]),
			];
