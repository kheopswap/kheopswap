import { formatUnits } from "viem";

type Amount = { plancks: bigint; decimals: number };

const RATE_DECIMALS = 18;

export const getSwapRate = (
	amountIn: Amount,
	amountOut: Amount,
): string | undefined =>
	amountIn.plancks && amountOut.plancks
		? formatUnits(
				(amountOut.plancks * 10n ** BigInt(amountIn.decimals + RATE_DECIMALS)) /
					(amountIn.plancks * 10n ** BigInt(amountOut.decimals)),
				RATE_DECIMALS,
			)
		: undefined;
