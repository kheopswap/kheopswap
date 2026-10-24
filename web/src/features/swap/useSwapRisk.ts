import { useCallback, useMemo, useState } from "react";
import { useStablePlancks } from "../../hooks/useStablePrice";
import type { TokenAmount, TokenId } from "../../registry/tokens/types";
import { isBigInt } from "../../utils/isBigInt";
import type { SwapRoute } from "./routes/swapRoute";
import {
	getSwapRisk,
	getValueLoss,
	isRiskAcknowledged,
	type RiskAcknowledgement,
} from "./swapRisk";

const NO_DELIVERY_FEE_VALUE = 0n;

const useSentValue = (
	tokenIdIn: TokenId | undefined,
	totalIn: bigint | null | undefined,
	deliveryFee: TokenAmount | undefined,
) => {
	const { stablePlancks: amountValue } = useStablePlancks({
		tokenId: tokenIdIn,
		plancks: totalIn,
	});
	const { stablePlancks: deliveryFeeValue } = useStablePlancks({
		tokenId: deliveryFee?.tokenId,
		plancks: deliveryFee?.plancks,
	});
	const feeValue = deliveryFee ? deliveryFeeValue : NO_DELIVERY_FEE_VALUE;
	return isBigInt(amountValue) && isBigInt(feeValue)
		? amountValue + feeValue
		: undefined;
};

export const useSwapRisk = ({
	route,
	totalIn,
	plancksOut,
	deliveryFee,
	priceImpact,
}: {
	route: SwapRoute | null;
	totalIn: bigint | null | undefined;
	plancksOut: bigint | null | undefined;
	deliveryFee: TokenAmount | undefined;
	priceImpact: number | undefined;
}) => {
	const swapRoute = route?.kind === "xcm-transfer" ? null : route;
	const sentValue = useSentValue(swapRoute?.tokenIdIn, totalIn, deliveryFee);
	const { stablePlancks: receivedValue } = useStablePlancks({
		tokenId: swapRoute?.tokenIdOut,
		plancks: plancksOut,
	});

	const risk = useMemo(
		() =>
			getSwapRisk({
				priceImpact: swapRoute ? priceImpact : undefined,
				valueLoss: getValueLoss(sentValue, receivedValue),
			}),
		[swapRoute, priceImpact, sentValue, receivedValue],
	);

	const key = `${swapRoute?.tokenIdIn}>${swapRoute?.tokenIdOut}:${totalIn}`;
	const [acknowledgement, setAcknowledgement] =
		useState<RiskAcknowledgement | null>(null);
	const isAcknowledged = isRiskAcknowledged(risk, acknowledgement, key);

	const onAcknowledgeChange = useCallback(
		(checked: boolean) =>
			setAcknowledgement(
				checked && risk.level !== "none"
					? { key, ratio: risk.worstRatio }
					: null,
			),
		[key, risk],
	);

	return { risk, isAcknowledged, onAcknowledgeChange };
};
