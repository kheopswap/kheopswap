import { keyBy, values } from "lodash-es";
import { useMemo } from "react";
import { APP_FEE_ADDRESS, APP_FEE_PERCENT } from "../../common/constants";
import { useBalance } from "../../hooks/useBalance";
import { useCanAccountReceive } from "../../hooks/useCanAccountReceive";
import { useExistentialDeposit } from "../../hooks/useExistentialDeposit";
import { usePoolSupplies } from "../../hooks/usePoolSupplies";
import { usePoolsByChainId } from "../../hooks/usePoolsByChainId";
import { useSetting } from "../../hooks/useSetting";
import { useToken } from "../../hooks/useToken";
import { useTokensByChainId } from "../../hooks/useTokensByChainId";
import { isChainIdAssetHub } from "../../registry/chains/chains";
import { getChainIdFromTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { splitAppCommission } from "../../utils/ammMath";
import { plancksToTokens, tokensToPlancks } from "../../utils/plancks";
import type { AmmSwapRoute } from "./routes/swapRoute";
import { useAmmPathQuote } from "./routes/useAmmPathQuote";

type UseSwapPricingProps = {
	tokenIdIn: TokenId | undefined;
	route: AmmSwapRoute | null;
	amountIn: string;
	accountAddress: string | undefined;
};

const useSwapInputs = ({
	tokenIdIn,
	amountIn,
}: {
	tokenIdIn: TokenId | undefined;
	amountIn: string;
}) => {
	const { data: tokenIn } = useToken({ tokenId: tokenIdIn });
	const appFeeAddress =
		tokenIdIn && isChainIdAssetHub(getChainIdFromTokenId(tokenIdIn))
			? APP_FEE_ADDRESS
			: undefined;

	const [plancksIn, feeIn, totalIn, isValidAmountIn] = useMemo(() => {
		if (!amountIn || !tokenIn) return [null, null, null, true];
		try {
			const totalIn = tokensToPlancks(amountIn, tokenIn.decimals);

			const appCommissionPercent =
				appFeeAddress && APP_FEE_PERCENT ? APP_FEE_PERCENT : 0;
			const { plancksIn, appFee: fee } = splitAppCommission(
				totalIn,
				appCommissionPercent,
			);

			return [plancksIn, fee, totalIn, true];
		} catch (_err) {
			return [null, null, null, false];
		}
	}, [amountIn, tokenIn, appFeeAddress]);

	const { data: checkCanAccountReceive } = useCanAccountReceive({
		address: appFeeAddress,
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
	route,
	amountIn,
	accountAddress,
}: UseSwapPricingProps) => {
	const { assetHub } = useRelayChains();
	const tokenIdOut = route?.tokenIdOut;

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

	const { swapPlancksIn, appCommission, totalIn, isValidAmountIn } =
		useSwapInputs({ tokenIdIn, amountIn });

	const pathQuote = useAmmPathQuote({
		path: route?.path ?? null,
		plancksIn: swapPlancksIn,
		slippage,
	});
	const swapPlancksOut = pathQuote.quote?.amountOut;
	const minPlancksOut = pathQuote.quote?.minOut ?? null;

	const amountOut = useMemo(() => {
		if (!swapPlancksOut || !tokenOut) return "";
		return plancksToTokens(swapPlancksOut, tokenOut.decimals);
	}, [swapPlancksOut, tokenOut]);

	const isLoadingAmountOut =
		!!swapPlancksIn &&
		!!tokenIn &&
		!!tokenOut &&
		!swapPlancksOut &&
		(pathQuote.isLoading || isLoadingBalanceIn);

	const hasInsufficientBalance = useMemo(() => {
		return balanceIn === undefined || totalIn === null
			? false
			: balanceIn < totalIn;
	}, [balanceIn, totalIn]);

	const { data: checkCanReceive, isLoading: isCheckingRecipient } =
		useCanAccountReceive({
			address: accountAddress,
			tokenId: tokenIdOut,
			plancks: minPlancksOut,
		});

	const outputErrorMessage = checkCanReceive?.reason || pathQuote.errorMessage;

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
		swapPlancksIn,
		appCommission,
		totalIn,
		isValidAmountIn,
		pathQuote,
		swapPlancksOut,
		amountOut,
		isLoadingAmountOut,
		priceImpact: pathQuote.quote?.priceImpact,
		minPlancksOut,
		hasInsufficientBalance,
		isCheckingRecipient,
		outputErrorMessage,
	};
};
