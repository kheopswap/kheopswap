import { parseTokenId } from "../../../../registry/tokens/helpers";
import type { AmmPath, PoolSwap } from "../ammPath";
import type { Parsed } from "../xcm/xcmQuote";

export type DestinationSwapFee = { plancks: bigint; nativePlancks: bigint };

export const getFeeSwap = (
	path: AmmPath,
	{ plancks, nativePlancks }: DestinationSwapFee,
): PoolSwap | null =>
	parseTokenId(path[0].tokenIdIn).type === "native"
		? null
		: { amountIn: plancks, amountOut: nativePlancks };

export const getDestinationSwapPlancksIn = (
	totalIn: bigint,
	fee: DestinationSwapFee,
): Parsed<bigint> =>
	totalIn > fee.plancks
		? { success: true, value: totalIn - fee.plancks }
		: { success: false, failure: { kind: "below-destination-fee" } };
