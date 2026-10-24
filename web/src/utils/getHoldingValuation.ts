import type { TokenId } from "../registry/tokens/types";
import { getAmmOutput } from "./ammMath";

type Reserves = [bigint, bigint];

export type HoldingValuationInput = {
	plancks: bigint;
	tokenId: TokenId;
	nativeTokenId: TokenId;
	stableTokenId: TokenId;
	reservesNativeToToken: Reserves | null;
	reservesNativeToStable: Reserves | null;
	lpFee: number;
	lowLiquidityFloorStablePlancks: bigint;
};

export type HoldingValuation = {
	stablePlancks: bigint | null;
	isLowLiquidity: boolean;
};

const UNPRICED: HoldingValuation = {
	stablePlancks: null,
	isLowLiquidity: false,
};

export const getHoldingValuation = ({
	plancks,
	tokenId,
	nativeTokenId,
	stableTokenId,
	reservesNativeToToken,
	reservesNativeToStable,
	lpFee,
	lowLiquidityFloorStablePlancks,
}: HoldingValuationInput): HoldingValuation => {
	const nativeToStable = (nativePlancks: bigint): bigint | null => {
		if (stableTokenId === nativeTokenId) return nativePlancks;
		if (!reservesNativeToStable) return null;
		const [reserveNative, reserveStable] = reservesNativeToStable;
		return reserveNative > 0n
			? (nativePlancks * reserveStable) / reserveNative
			: null;
	};

	if (tokenId === stableTokenId)
		return { stablePlancks: plancks, isLowLiquidity: false };

	if (tokenId === nativeTokenId)
		return { stablePlancks: nativeToStable(plancks), isLowLiquidity: false };

	if (!reservesNativeToToken) return UNPRICED;
	const [reserveNative, reserveToken] = reservesNativeToToken;
	if (reserveNative === 0n || reserveToken === 0n) return UNPRICED;

	const poolDepthStablePlancks = nativeToStable(reserveNative);
	if (poolDepthStablePlancks === null) return UNPRICED;
	if (poolDepthStablePlancks < lowLiquidityFloorStablePlancks)
		return { stablePlancks: null, isLowLiquidity: true };

	const { amountOut: exitNativePlancks } = getAmmOutput(
		plancks,
		reserveToken,
		reserveNative,
		lpFee,
	);

	return {
		stablePlancks: nativeToStable(exitNativePlancks),
		isLowLiquidity: false,
	};
};
