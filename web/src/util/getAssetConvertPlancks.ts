import { isBigInt } from "../../../packages/utils/src/isBigInt";
import { plancksToTokens } from "../../../packages/utils/src/plancks";

import type { Token } from "src/config/tokens";

export const getAssetConvertPlancks = (
	plancks: bigint,
	tokenIn: Token,
	nativeToken: Token,
	tokenOut: Token,
	reservesNativeToTokenIn: [bigint, bigint],
	reservesNativeToTokenOut: [bigint, bigint],
) => {
	if (tokenIn.id === tokenOut.id) return plancks;

	if (nativeToken.id !== tokenOut.id && !reservesNativeToTokenOut)
		return undefined;

	const [nativeToTokenOutReserveIn, nativeToTokenOutReserveOut] =
		nativeToken.id !== tokenOut.id ? reservesNativeToTokenOut : [1n, 1n];

	if (tokenIn.id === nativeToken.id) {
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

// returns the number of tokens, as string (unsortable)
export const getConvertTokens = (
	plancks: bigint,
	tokenIn: Token,
	nativeToken: Token,
	tokenOut: Token,
	reservesNativeToTokenIn: [bigint, bigint],
	reservesNativeToTokenOut: [bigint, bigint],
) => {
	const outPlancks = getAssetConvertPlancks(
		plancks,
		tokenIn,
		nativeToken,
		tokenOut,
		reservesNativeToTokenIn,
		reservesNativeToTokenOut,
	);

	return isBigInt(outPlancks)
		? plancksToTokens(outPlancks, tokenOut.decimals)
		: undefined;
};
