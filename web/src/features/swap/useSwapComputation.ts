import type { TokenId } from "@kheopswap/registry";
import { plancksToTokens } from "@kheopswap/utils";
import { useMemo } from "react";
import {
	useAssetConvertPlancks,
	usePoolReservesByTokenIds,
	useToken,
} from "src/hooks";
import { useRelayChains } from "src/state";
import { useAssetConvertionLPFee } from "./useAssetConvertionLPFee";

type UseSwapComputationProps = {
	tokenIdIn: TokenId | undefined;
	tokenIdOut: TokenId | undefined;
	swapPlancksIn: bigint | null;
	totalIn: bigint | null;
	slippage: number;
};

type UseSwapComputationResult = {
	/** Output amount in plancks */
	swapPlancksOut: bigint | undefined;
	/** Output amount as formatted string */
	amountOut: string;
	/** Minimum output after slippage */
	minPlancksOut: bigint | null;
	/** Protocol fee (LP fee) */
	protocolCommission: bigint | undefined;
	/** Price impact as decimal (e.g., 0.01 = 1%) */
	priceImpact: number | undefined;
	/** Reserve of input token in pool */
	reserveIn: bigint | undefined;
	/** Reserve of output token in pool */
	reserveOut: bigint | undefined;
	/** Loading states */
	isLoadingReserves: boolean;
	isLoadingLpFee: boolean;
};

/**
 * Computes swap output amounts using the constant product formula.
 *
 * Uses the Asset Conversion pallet's formula:
 * - Applies LP fee (typically 0.3%)
 * - Calculates output using x * y = k
 * - Computes price impact vs raw conversion
 * - Applies slippage tolerance for minimum output
 */
export const useSwapComputation = ({
	tokenIdIn,
	tokenIdOut,
	swapPlancksIn,
	totalIn,
	slippage,
}: UseSwapComputationProps): UseSwapComputationResult => {
	const { assetHub } = useRelayChains();

	const { data: reserves, isLoading: isLoadingReserves } =
		usePoolReservesByTokenIds({
			tokenId1: tokenIdIn,
			tokenId2: tokenIdOut,
		});

	const { data: lpFee, isLoading: isLoadingLpFee } = useAssetConvertionLPFee({
		chain: assetHub,
	});

	const { data: tokenOut } = useToken({ tokenId: tokenIdOut });

	const [reserveIn, reserveOut] = useMemo(
		() => reserves ?? [undefined, undefined],
		[reserves],
	);

	const [swapPlancksOut, protocolCommission] = useMemo(() => {
		// https://github.com/paritytech/substrate/blob/e076bdad1fefb5a0e2461acf7e2cab1192f3c9f3/frame/asset-conversion/src/lib.rs#L1108
		if (!lpFee || !reserveIn || !reserveOut || !swapPlancksIn)
			return [undefined, undefined];

		const safeMultiplier = 1000n;

		if (reserveIn === 0n || reserveOut === 0n) throw new Error("No liquidity");

		const amountInWithFee = swapPlancksIn * (safeMultiplier - BigInt(lpFee));
		const protocolCommission =
			(safeMultiplier * swapPlancksIn - amountInWithFee) / safeMultiplier;
		const numerator = amountInWithFee * reserveOut;
		const denominator = reserveIn * safeMultiplier + amountInWithFee;
		const plancksOut = numerator / denominator;
		return [plancksOut, protocolCommission];
	}, [lpFee, swapPlancksIn, reserveIn, reserveOut]);

	const amountOut = useMemo(() => {
		if (!swapPlancksOut || !tokenOut) return "";
		return plancksToTokens(swapPlancksOut, tokenOut.decimals);
	}, [swapPlancksOut, tokenOut]);

	const { plancksOut: rawPlancksOut } = useAssetConvertPlancks({
		tokenIdIn,
		tokenIdOut,
		plancks: totalIn,
	});

	const priceImpact = useMemo(() => {
		// ratio difference between rawplancksout and swapplancksout
		if (!rawPlancksOut || !swapPlancksOut) return undefined;

		return (
			-Number((10000n * (rawPlancksOut - swapPlancksOut)) / rawPlancksOut) /
			10000
		);
	}, [rawPlancksOut, swapPlancksOut]);

	const minPlancksOut = useMemo(() => {
		if (!swapPlancksOut || slippage === undefined) return null;
		const safetyDecimal = 10000n;
		return (
			(swapPlancksOut *
				(safetyDecimal - BigInt(slippage * Number(safetyDecimal)))) /
			safetyDecimal
		);
	}, [swapPlancksOut, slippage]);

	return {
		swapPlancksOut,
		amountOut,
		minPlancksOut,
		protocolCommission,
		priceImpact,
		reserveIn,
		reserveOut,
		isLoadingReserves,
		isLoadingLpFee,
	};
};
