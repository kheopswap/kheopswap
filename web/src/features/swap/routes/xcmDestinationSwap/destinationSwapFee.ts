import { parseTokenId } from "../../../../registry/tokens/helpers";
import { getAmmInput } from "../../../../utils/ammMath";
import type { AmmPath, PoolHop, PoolSwap } from "../ammPath";
import type { Parsed } from "../xcm/xcmQuote";

export type DestinationSwapFee = { plancks: bigint; nativePlancks: bigint };

const isNativeInput = (path: AmmPath) =>
	parseTokenId(path[0].tokenIdIn).type === "native";

export const getDestinationSwapFee = (
	firstPool: PoolHop,
	lpFee: number,
	nativePlancks: bigint,
): DestinationSwapFee | null => {
	const plancks = isNativeInput([firstPool])
		? nativePlancks
		: getAmmInput(
				nativePlancks,
				firstPool.reserveIn,
				firstPool.reserveOut,
				lpFee,
			);
	return plancks === null ? null : { plancks, nativePlancks };
};

export const getFeeSwap = (
	path: AmmPath,
	{ plancks, nativePlancks }: DestinationSwapFee,
): PoolSwap | null =>
	isNativeInput(path) ? null : { amountIn: plancks, amountOut: nativePlancks };
export const getDestinationSwapPlancksIn = (
	totalIn: bigint,
	fee: DestinationSwapFee,
): Parsed<bigint> =>
	totalIn > fee.plancks
		? { success: true, value: totalIn - fee.plancks }
		: { success: false, failure: { kind: "below-destination-fee" } };
