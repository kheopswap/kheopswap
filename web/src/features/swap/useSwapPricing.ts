import { keyBy, values } from "lodash-es";
import { useMemo } from "react";
import { APP_FEE_ADDRESS, APP_FEE_PERCENT } from "../../common/constants";
import { useAssetConvertPlancks } from "../../hooks/useAssetConvertPlancks";
import { useBalance } from "../../hooks/useBalance";
import { useCanAccountReceive } from "../../hooks/useCanAccountReceive";
import { useExistentialDeposit } from "../../hooks/useExistentialDeposit";
import { usePoolReservesByTokenIds } from "../../hooks/usePoolReservesByTokenIds";
import { usePoolSupplies } from "../../hooks/usePoolSupplies";
import { usePoolsByChainId } from "../../hooks/usePoolsByChainId";
import { useSetting } from "../../hooks/useSetting";
import { useToken } from "../../hooks/useToken";
import { useTokensByChainId } from "../../hooks/useTokensByChainId";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { plancksToTokens, tokensToPlancks } from "../../utils/plancks";
import { useAssetConvertionLPFee } from "./useAssetConvertionLPFee";

type UseSwapPricingProps = {
	tokenIdIn: TokenId | undefined;
	tokenIdOut: TokenId | undefined;
	amountIn: string;
	accountAddress: string | undefined;
};

/**
 * Computes app commission from the input amount.
 * Separates the app fee from the total so the swap extrinsic operates on net plancks.
 */
const useSwapInputs = ({
	tokenIdIn,
	amountIn,
}: {
	tokenIdIn: TokenId | undefined;
	amountIn: string;
}) => {
	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });

	const [plancksIn, feeIn, totalIn, isValidAmountIn] = useMemo(() => {
		if (!amountIn || !tokenIn) return [null, null, null, true];
		try {
			const totalIn = tokensToPlancks(amountIn, tokenIn.decimals);

			const appCommissionPercent =
				!!APP_FEE_ADDRESS && !!APP_FEE_PERCENT ? APP_FEE_PERCENT : 0;
			const feeNum =
				totalIn * BigInt(Number(appCommissionPercent * 10000).toFixed());
			const fee = feeNum / 1000000n;
			const plancksIn = totalIn - fee;

			return [plancksIn, fee, totalIn, true];
		} catch (_err) {
			return [null, null, null, false];
		}
	}, [amountIn, tokenIn]);

	const { data: checkCanAccountReceive } = useCanAccountReceive({
		address: APP_FEE_ADDRESS,
		tokenId: tokenIdIn,
		plancks: feeIn,
	});

	const [swapPlancksIn, appCommission] = useMemo(() => {
		return checkCanAccountReceive?.canReceive
			? [plancksIn, feeIn]
			: [totalIn, 0n];
	}, [checkCanAccountReceive?.canReceive, feeIn, plancksIn, totalIn]);

	return { swapPlancksIn, appCommission, totalIn, isValidAmountIn };
};

export const useSwapPricing = ({
	tokenIdIn,
	tokenIdOut,
	amountIn,
	accountAddress,
}: UseSwapPricingProps) => {
	const { assetHub } = useRelayChains();

	const { data: allTokens, isLoading: isLoadingAllTokens } = useTokensByChainId(
		{
			chainId: assetHub.id,
		},
	);
	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const pairs = useMemo(() => pools?.map((p) => p.tokenIds) ?? [], [pools]);
	const { data: poolSupplies } = usePoolSupplies({ pairs });

	const [tokens, isLoadingTokens] = useMemo(() => {
		const swappableAssetIds =
			pools
				?.filter((p) => {
					const supplyState = poolSupplies.find(
						(s) =>
							s.pair.includes(p.tokenIds[0]) && s.pair.includes(p.tokenIds[1]),
					);
					return !!supplyState?.supply;
				})
				.flatMap((p) => p.tokenIds) ?? [];
		return [
			keyBy(
				values(allTokens).filter(
					(t) => t.type === "native" || swappableAssetIds.includes(t.id),
				) ?? [],
				"id",
			),
			isLoadingAllTokens ||
				isLoadingPools ||
				poolSupplies.some((s) => s.isLoading),
		];
	}, [allTokens, isLoadingAllTokens, isLoadingPools, poolSupplies, pools]);

	const [slippage, setSlippage] = useSetting("slippage");

	const { data: reserves, isLoading: isLoadingReserves } =
		usePoolReservesByTokenIds({
			tokenId1: tokenIdIn,
			tokenId2: tokenIdOut,
		});

	const { data: lpFee, isLoading: isLoadingLpFee } = useAssetConvertionLPFee({
		chain: assetHub,
	});

	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });
	const { data: tokenOut } = useToken({ tokenId: tokenIdOut });

	const { data: balanceIn, isLoading: isLoadingBalanceIn } = useBalance({
		address: accountAddress,
		tokenId: tokenIdIn,
	});
	const { data: balanceOut, isLoading: isLoadingBalanceOut } = useBalance({
		address: accountAddress,
		tokenId: tokenIdOut,
	});

	const { data: edTokenIn } = useExistentialDeposit({
		tokenId: tokenIdIn,
	});

	const isLoading = useMemo(
		() => isLoadingReserves || isLoadingLpFee || isLoadingBalanceIn,
		[isLoadingBalanceIn, isLoadingLpFee, isLoadingReserves],
	);

	const [reserveIn, reserveOut] = useMemo(
		() => reserves ?? [undefined, undefined],
		[reserves],
	);

	const { swapPlancksIn, appCommission, totalIn, isValidAmountIn } =
		useSwapInputs({ tokenIdIn, amountIn });

	// AMM output calculation
	// https://github.com/paritytech/substrate/blob/e076bdad1fefb5a0e2461acf7e2cab1192f3c9f3/frame/asset-conversion/src/lib.rs#L1108
	const [swapPlancksOut, protocolCommission] = useMemo(() => {
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

	const isLoadingAmountOut =
		!!swapPlancksIn && !!tokenIn && !!tokenOut && !swapPlancksOut && isLoading;

	const { plancksOut: rawPlancksOut } = useAssetConvertPlancks({
		tokenIdIn,
		tokenIdOut,
		plancks: totalIn,
	});

	const priceImpact = useMemo(() => {
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

	const hasInsufficientBalance = useMemo(() => {
		return balanceIn === undefined || totalIn === null
			? false
			: balanceIn < totalIn;
	}, [balanceIn, totalIn]);

	const hasInsufficientLiquidity = useMemo(() => {
		return reserveIn === 0n && reserveOut === 0n;
	}, [reserveIn, reserveOut]);

	const isPoolNotFound = useMemo(
		() => tokenIn && tokenOut && !reserves && !isLoadingReserves,
		[tokenIn, tokenOut, reserves, isLoadingReserves],
	);

	const { data: checkCanReceive, isLoading: isCheckingRecipient } =
		useCanAccountReceive({
			address: accountAddress,
			tokenId: tokenIdOut,
			plancks: minPlancksOut,
		});

	const outputErrorMessage = useMemo(() => {
		if (checkCanReceive?.reason) return checkCanReceive.reason;
		if (hasInsufficientLiquidity) return "Insufficient liquidity";
		if (isPoolNotFound) return "Liquidity pool not found";
		return null;
	}, [hasInsufficientLiquidity, isPoolNotFound, checkCanReceive?.reason]);

	return {
		tokens,
		isLoadingTokens,
		tokenIn,
		tokenOut,
		balanceIn,
		balanceOut,
		isLoadingBalanceIn,
		isLoadingBalanceOut,
		edTokenIn,
		slippage,
		setSlippage,
		reserveIn,
		reserveOut,
		isLoadingReserves,
		isLoadingLpFee,
		isLoading,
		swapPlancksIn,
		appCommission,
		totalIn,
		isValidAmountIn,
		swapPlancksOut,
		protocolCommission,
		amountOut,
		isLoadingAmountOut,
		priceImpact,
		minPlancksOut,
		hasInsufficientBalance,
		hasInsufficientLiquidity,
		isPoolNotFound,
		isCheckingRecipient,
		outputErrorMessage,
	};
};
