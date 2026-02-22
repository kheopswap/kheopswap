/**
 * Pure constant-product AMM math functions.
 *
 * These implement the Substrate AssetConversion pallet formulas:
 * https://github.com/paritytech/substrate/blob/e076bdad1fefb5a0e2461acf7e2cab1192f3c9f3/frame/asset-conversion/src/lib.rs#L1108
 */

/**
 * Compute the output amount for a constant-product AMM swap, applying the LP fee.
 *
 * @param amountIn  Input amount in plancks.
 * @param reserveIn  Reserve of the input asset.
 * @param reserveOut  Reserve of the output asset.
 * @param lpFee  LP fee in parts-per-thousand (e.g. 3 → 0.3%).
 * @returns `{ amountOut, protocolCommission }` — output plancks and the fee retained by the pool.
 */
export const getAmmOutput = (
	amountIn: bigint,
	reserveIn: bigint,
	reserveOut: bigint,
	lpFee: number,
): { amountOut: bigint; protocolCommission: bigint } => {
	if (reserveIn === 0n || reserveOut === 0n) throw new Error("No liquidity");

	const safeMultiplier = 1000n;
	const amountInWithFee = amountIn * (safeMultiplier - BigInt(lpFee));
	const protocolCommission =
		(safeMultiplier * amountIn - amountInWithFee) / safeMultiplier;
	const numerator = amountInWithFee * reserveOut;
	const denominator = reserveIn * safeMultiplier + amountInWithFee;
	const amountOut = numerator / denominator;

	return { amountOut, protocolCommission };
};

/**
 * Compute the price impact of a swap relative to the spot price.
 *
 * @param spotPlancksOut  Output at the current spot price (no-fee AMM cross-rate).
 * @param actualPlancksOut  Output after AMM + fee computation.
 * @returns Negative ratio (e.g. -0.012 means 1.2% worse than spot).
 */
export const getPriceImpact = (
	spotPlancksOut: bigint,
	actualPlancksOut: bigint,
): number => {
	if (spotPlancksOut === 0n) return 0;
	return (
		-Number((10000n * (spotPlancksOut - actualPlancksOut)) / spotPlancksOut) /
		10000
	);
};

/**
 * Compute the minimum acceptable output after applying the user's slippage tolerance.
 *
 * @param plancksOut  Expected output.
 * @param slippage  Slippage tolerance as a ratio (e.g. 0.005 → 0.5%).
 * @returns Minimum plancks out.
 */
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

/**
 * Split the app commission from the total user input.
 *
 * @param totalIn  Total plancks the user entered.
 * @param appFeePercent  App fee as a percentage (e.g. 0.3 → 0.3%).
 * @returns `{ plancksIn, appFee }` — net input for the swap and the fee portion.
 */
export const splitAppCommission = (
	totalIn: bigint,
	appFeePercent: number,
): { plancksIn: bigint; appFee: bigint } => {
	const feeNum = totalIn * BigInt(Number(appFeePercent * 10000).toFixed());
	const appFee = feeNum / 1000000n;
	const plancksIn = totalIn - appFee;
	return { plancksIn, appFee };
};

/**
 * Compute the maximum amount a user can swap, reserving funds for fees and ED.
 *
 * For native tokens, deducts `2 × fee + existentialDeposit` from the balance
 * to keep the account alive. For non-native tokens, returns the full balance.
 *
 * @param balance  Available balance in plancks.
 * @param feeEstimate  Estimated transaction fee.
 * @param existentialDeposit  Chain existential deposit for the token.
 * @param isNative  Whether the token is the chain's native token.
 * @returns Maximum swappable plancks.
 */
export const getMaxSwapAmount = (
	balance: bigint,
	feeEstimate: bigint,
	existentialDeposit: bigint,
	isNative: boolean,
): bigint => {
	if (!isNative) return balance;
	const reserved = 2n * feeEstimate + existentialDeposit;
	return reserved <= balance ? balance - reserved : balance;
};
