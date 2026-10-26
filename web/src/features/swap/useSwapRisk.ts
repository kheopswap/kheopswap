import { useCallback, useEffect, useMemo, useState } from "react";
import { useStablePlancks } from "../../hooks/useStablePrice";
import type { TokenAmount, TokenId } from "../../registry/tokens/types";
import { isBigInt } from "../../utils/isBigInt";
import type { SwapRoute } from "./routes/swapRoute";
import {
	getShare,
	getSwapRisk,
	getValueLoss,
	isAcknowledgementStale,
	isRiskAcknowledged,
	type RiskAcknowledgement,
	type ValueLoss,
} from "./swapRisk";

const NO_FEE_VALUE = 0n;

const useFeeValue = (fee: TokenAmount | undefined) => {
	const value = useStablePlancks({
		tokenId: fee?.tokenId,
		plancks: fee?.plancks,
	});
	return {
		isLoading: !!fee && value.isLoading,
		value: fee ? value.stablePlancks : NO_FEE_VALUE,
	};
};

const useSentValue = (
	tokenIdIn: TokenId | undefined,
	totalIn: bigint | null | undefined,
	deliveryFee: TokenAmount | undefined,
) => {
	const amount = useStablePlancks({ tokenId: tokenIdIn, plancks: totalIn });
	const fee = useFeeValue(deliveryFee);
	return {
		isLoading: amount.isLoading || fee.isLoading,
		sentValue:
			isBigInt(amount.stablePlancks) && isBigInt(fee.value)
				? amount.stablePlancks + fee.value
				: undefined,
		deliveryFeeValue: fee.value,
	};
};

export const useSwapRisk = ({
	signer,
	route,
	totalIn,
	plancksOut,
	deliveryFee,
	destinationFee,
	priceImpact,
}: {
	signer: string | undefined;
	route: SwapRoute | null;
	totalIn: bigint | null | undefined;
	plancksOut: bigint | null | undefined;
	deliveryFee: TokenAmount | undefined;
	destinationFee: TokenAmount | undefined;
	priceImpact: number | undefined;
}) => {
	const sent = useSentValue(route?.tokenIdIn, totalIn, deliveryFee);
	const received = useStablePlancks({
		tokenId: route?.tokenIdOut,
		plancks: plancksOut,
	});
	const destinationFeeValue = useFeeValue(destinationFee);

	const valueLoss = useMemo((): ValueLoss | undefined => {
		const ratio = getValueLoss(sent.sentValue, received.stablePlancks);
		if (ratio === undefined) return undefined;
		return {
			kind: route?.kind === "xcm-transfer" ? "fees" : "value-loss",
			ratio,
			feeShares: {
				"delivery-fee": getShare(sent.deliveryFeeValue, sent.sentValue) ?? 0,
				"destination-fee":
					getShare(destinationFeeValue.value, sent.sentValue) ?? 0,
			},
		};
	}, [
		route?.kind,
		sent.sentValue,
		sent.deliveryFeeValue,
		destinationFeeValue.value,
		received.stablePlancks,
	]);

	const risk = useMemo(
		() => getSwapRisk({ priceImpact, valueLoss }),
		[priceImpact, valueLoss],
	);

	const key = `${signer}:${route?.tokenIdIn}>${route?.tokenIdOut}:${totalIn}`;
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
		!!route &&
		isBigInt(totalIn) &&
		(sent.isLoading || received.isLoading || destinationFeeValue.isLoading);

	return { risk, isAcknowledged, isAssessing, onAcknowledgeChange };
};
