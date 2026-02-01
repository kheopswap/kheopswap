/**
 * Convert plancks from one token to another using liquidity pool reserves.
 * This is a pure calculation function for asset conversion pricing.
 *
 * @param plancks - Amount to convert in smallest units
 * @param tokenIdIn - Source token identifier
 * @param tokenIdNative - Native token identifier for the chain
 * @param tokenIdOut - Target token identifier
 * @param reservesNativeToTokenIn - Pool reserves [native, tokenIn] for tokenIn pool
 * @param reservesNativeToTokenOut - Pool reserves [native, tokenOut] for tokenOut pool
 * @returns Converted amount in target token plancks, or undefined if conversion not possible
 */
export const getAssetConvertPlancks = (
	plancks: bigint,
	tokenIdIn: string,
	tokenIdNative: string,
	tokenIdOut: string,
	reservesNativeToTokenIn: [bigint, bigint],
	reservesNativeToTokenOut: [bigint, bigint],
): bigint | undefined => {
	if (tokenIdIn === tokenIdOut) return plancks;

	// Converting 0 of any token is always 0
	if (plancks === 0n) return 0n;

	if (tokenIdNative !== tokenIdOut && !reservesNativeToTokenOut)
		return undefined;

	const [nativeToTokenOutReserveIn, nativeToTokenOutReserveOut] =
		tokenIdNative !== tokenIdOut ? reservesNativeToTokenOut : [1n, 1n];

	if (tokenIdIn === tokenIdNative) {
		const stablePlancks =
			(plancks * nativeToTokenOutReserveOut) / nativeToTokenOutReserveIn;
		return stablePlancks;
	}

	if (!reservesNativeToTokenIn || reservesNativeToTokenIn?.includes(0n))
		return undefined;
	const [nativeToTokenInReserveIn, nativeToTokenInReserveOut] =
		reservesNativeToTokenIn;

	const nativePlancks =
		(plancks * nativeToTokenInReserveIn) / nativeToTokenInReserveOut;
	const outPlancks =
		(nativePlancks * nativeToTokenOutReserveOut) / nativeToTokenOutReserveIn;
	return outPlancks;
};
