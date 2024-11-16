import { logger } from "@kheopswap/utils";

import type { TokenId } from "@kheopswap/registry";

export const getAssetConvertPlancks = (
	plancks: bigint,
	tokenIdIn: TokenId,
	tokenIdNative: TokenId,
	tokenIdOut: TokenId,
	reservesNativeToTokenIn: [bigint, bigint],
	reservesNativeToTokenOut: [bigint, bigint],
) => {
	const stop = logger.cumulativeTimer("getAssetConvertPlancks");

	try {
		if (tokenIdIn === tokenIdOut) return plancks;

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
	} finally {
		stop();
	}
};
