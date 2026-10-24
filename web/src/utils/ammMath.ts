import type { Token, TokenAmount } from "../registry/tokens/types";

// Modern runtimes store `LPFee` as a Permill (3000 = 0.3%), older ones such as
// Paseo Asset Hub as per-mille (3 = 0.3%), which caps legacy values below 1000.
// papi decodes both to a bare number, so any value >= 1000 must be a Permill.
export const getLpFeeUnit = (lpFee: number): bigint =>
	lpFee >= 1000 ? 1_000_000n : 1_000n;

export const getAmmOutput = (
	amountIn: bigint,
	reserveIn: bigint,
	reserveOut: bigint,
	lpFee: number,
): { amountOut: bigint; protocolCommission: bigint } => {
	if (reserveIn === 0n || reserveOut === 0n) throw new Error("No liquidity");

	const feeUnit = getLpFeeUnit(lpFee);
	const amountInWithFee = amountIn * (feeUnit - BigInt(lpFee));
	const protocolCommission = (feeUnit * amountIn - amountInWithFee) / feeUnit;
	const numerator = amountInWithFee * reserveOut;
	const denominator = reserveIn * feeUnit + amountInWithFee;
	const amountOut = numerator / denominator;

	return { amountOut, protocolCommission };
};

export const getAmmInput = (
	amountOut: bigint,
	reserveIn: bigint,
	reserveOut: bigint,
	lpFee: number,
): bigint | null => {
	if (amountOut >= reserveOut) return null;

	const feeUnit = getLpFeeUnit(lpFee);
	return (
		(reserveIn * amountOut * feeUnit) /
			((reserveOut - amountOut) * (feeUnit - BigInt(lpFee))) +
		1n
	);
};

export const getMinAmountOut = (
	plancksOut: bigint,
	slippage: number,
): bigint => {
	const safetyDecimal = 10000n;
	return (
		(plancksOut * (safetyDecimal - BigInt(slippage * Number(safetyDecimal)))) /
		safetyDecimal
	);
};

export const splitAppCommission = (
	totalIn: bigint,
	appFeePercent: number,
): { plancksIn: bigint; appFee: bigint } => {
	const feeNum = totalIn * BigInt(Number(appFeePercent * 10000).toFixed());
	const appFee = feeNum / 1000000n;
	const plancksIn = totalIn - appFee;
	return { plancksIn, appFee };
};

export const getMaxSwapAmount = ({
	balance,
	tokenIn,
	existentialDeposit,
	fee,
	deliveryFee,
}: {
	balance: bigint;
	tokenIn: Pick<Token, "id" | "type">;
	existentialDeposit: bigint;
	fee: TokenAmount;
	deliveryFee: TokenAmount | undefined;
}): bigint => {
	const paysFee = fee.tokenId === tokenIn.id;
	const reserved =
		(paysFee ? 2n * fee.plancks : 0n) +
		(paysFee || tokenIn.type === "native" ? existentialDeposit : 0n) +
		(deliveryFee?.tokenId === tokenIn.id ? deliveryFee.plancks : 0n);
	return reserved <= balance ? balance - reserved : balance;
};
