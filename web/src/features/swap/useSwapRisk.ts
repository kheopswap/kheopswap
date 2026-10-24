import { useCallback, useEffect, useMemo, useState } from "react";
import { useStablePlancks } from "../../hooks/useStablePrice";
import type { TokenAmount, TokenId } from "../../registry/tokens/types";
import { isBigInt } from "../../utils/isBigInt";
import type { SwapRoute } from "./routes/swapRoute";
import {
	getSwapRisk,
	getValueLoss,
	isAcknowledgementStale,
	isRiskAcknowledged,
	type RiskAcknowledgement,
} from "./swapRisk";

const NO_DELIVERY_FEE_VALUE = 0n;

const useSentValue = (
	tokenIdIn: TokenId | undefined,
	totalIn: bigint | null | undefined,
	deliveryFee: TokenAmount | undefined,
) => {
	const amount = useStablePlancks({ tokenId: tokenIdIn, plancks: totalIn });
	const fee = useStablePlancks({
		tokenId: deliveryFee?.tokenId,
		plancks: deliveryFee?.plancks,
	});
	const feeValue = deliveryFee ? fee.stablePlancks : NO_DELIVERY_FEE_VALUE;
	return {
		isLoading: amount.isLoading || (!!deliveryFee && fee.isLoading),
		sentValue:
			isBigInt(amount.stablePlancks) && isBigInt(feeValue)
				? amount.stablePlancks + feeValue
				: undefined,
	};
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
	const sent = useSentValue(swapRoute?.tokenIdIn, totalIn, deliveryFee);
	const received = useStablePlancks({
		tokenId: swapRoute?.tokenIdOut,
		plancks: plancksOut,
	});

	const risk = useMemo(
		() =>
			getSwapRisk({
				priceImpact: swapRoute ? priceImpact : undefined,
				valueLoss: getValueLoss(sent.sentValue, received.stablePlancks),
			}),
		[swapRoute, priceImpact, sent.sentValue, received.stablePlancks],
	);

	const key = `${swapRoute?.tokenIdIn}>${swapRoute?.tokenIdOut}:${totalIn}`;
	const [acknowledgement, setAcknowledgement] =
		useState<RiskAcknowledgement | null>(null);
	useEffect(() => {
		if (isAcknowledgementStale(acknowledgement, risk, key))
			setAcknowledgement(null);
	}, [acknowledgement, risk, key]);
	const isAcknowledged = isRiskAcknowledged(risk, acknowledgement, key);

	const onAcknowledgeChange = useCallback(
		(checked: boolean) =>
			setAcknowledgement(
				checked && risk.level !== "none" ? { key, losses: risk.losses } : null,
			),
		[key, risk],
	);

	const isAssessing =
		!!swapRoute && isBigInt(totalIn) && (sent.isLoading || received.isLoading);

	return { risk, isAcknowledged, isAssessing, onAcknowledgeChange };
};
