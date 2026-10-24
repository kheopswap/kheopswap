import type { TokenId } from "../registry/tokens/types";
import { logger } from "../utils/logger";

type Reserves = [bigint, bigint];

const hasLiquidity = (reserves: Reserves | undefined): reserves is Reserves =>
	!!reserves && !reserves.includes(0n);

export const getAssetConvertPlancks = (
	plancks: bigint,
	tokenIdIn: TokenId,
	tokenIdNative: TokenId,
	tokenIdOut: TokenId,
	reservesNativeToTokenIn: Reserves,
	reservesNativeToTokenOut: Reserves,
) => {
	const stop = logger.cumulativeTimer("getAssetConvertPlancks");

	try {
		if (tokenIdIn === tokenIdOut) return plancks;

		const reservesOut: Reserves | undefined =
			tokenIdNative === tokenIdOut ? [1n, 1n] : reservesNativeToTokenOut;
		if (!hasLiquidity(reservesOut)) return undefined;
		const [nativeToTokenOutReserveIn, nativeToTokenOutReserveOut] = reservesOut;

		if (tokenIdIn === tokenIdNative)
			return (plancks * nativeToTokenOutReserveOut) / nativeToTokenOutReserveIn;

		if (!hasLiquidity(reservesNativeToTokenIn)) return undefined;
		const [nativeToTokenInReserveIn, nativeToTokenInReserveOut] =
			reservesNativeToTokenIn;

		const nativePlancks =
			(plancks * nativeToTokenInReserveIn) / nativeToTokenInReserveOut;
		return (
			(nativePlancks * nativeToTokenOutReserveOut) / nativeToTokenOutReserveIn
		);
	} finally {
		stop();
	}
};
