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

export type UnvaluedStatus = "thin-pool" | "holding-dwarfs-pool" | "unpriced";

export type HoldingValuation =
	| { status: "priced"; stablePlancks: bigint }
	| { status: UnvaluedStatus; stablePlancks: null };

export const UNPRICED: HoldingValuation = {
	status: "unpriced",
	stablePlancks: null,
};

export const isLowLiquidity = (status: HoldingValuation["status"]) =>
	status === "thin-pool" || status === "holding-dwarfs-pool";

export const valuationOf = (stablePlancks: bigint | null): HoldingValuation =>
	stablePlancks === null ? UNPRICED : { status: "priced", stablePlancks };

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

	if (tokenId === stableTokenId) return valuationOf(plancks);

	if (tokenId === nativeTokenId) return valuationOf(nativeToStable(plancks));

	if (!reservesNativeToToken) return UNPRICED;
	const [reserveNative, reserveToken] = reservesNativeToToken;
	if (reserveNative === 0n || reserveToken === 0n) return UNPRICED;

	const poolDepthStablePlancks = nativeToStable(reserveNative);
	if (poolDepthStablePlancks === null) return UNPRICED;
	if (poolDepthStablePlancks < lowLiquidityFloorStablePlancks)
		return { status: "thin-pool", stablePlancks: null };

	const { amountOut: exitNativePlancks } = getAmmOutput(
		plancks,
		reserveToken,
		reserveNative,
		lpFee,
	);
	const spotNativePlancks = (plancks * reserveNative) / reserveToken;
	if (exitNativePlancks * 2n < spotNativePlancks)
		return { status: "holding-dwarfs-pool", stablePlancks: null };

	return valuationOf(nativeToStable(exitNativePlancks));
};
