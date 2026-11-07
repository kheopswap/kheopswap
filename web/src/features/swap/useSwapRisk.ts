import { useCallback, useEffect, useMemo, useState } from "react";
import { useStablePlancksMulti } from "../../hooks/useStablePlancksMulti";
import { useStablePlancks } from "../../hooks/useStablePrice";
import type { Token, TokenAmount, TokenId } from "../../registry/tokens/types";
import { isBigInt } from "../../utils/isBigInt";
import type { SwapRoute } from "./routes/swapRoute";
import {
	getFeeShare,
	getShare,
	getSwapRisk,
	getTransferFees,
	getValueLoss,
	isAcknowledgementStale,
	isRiskAcknowledged,
	type RiskAcknowledgement,
	type TransferFees,
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

type TransferToken = Pick<Token, "id" | "decimals"> | null | undefined;

const NO_AMOUNTS: TokenAmount[] = [];

const useTransferFees = ({
	route,
	tokenIn,
	tokenOut,
	totalIn,
	received,
	deliveryFee,
}: {
	route: SwapRoute | null;
	tokenIn: TransferToken;
	tokenOut: TransferToken;
	totalIn: bigint | null | undefined;
	received: bigint | null | undefined;
	deliveryFee: TokenAmount | undefined;
}) => {
	const fees = useMemo(
		() =>
			route?.kind === "xcm-transfer"
				? getTransferFees({ tokenIn, tokenOut, totalIn, received, deliveryFee })
				: undefined,
		[route?.kind, tokenIn, tokenOut, totalIn, received, deliveryFee],
	);
	const amounts = useMemo(
		() =>
			fees && tokenIn && totalIn
				? [{ tokenId: tokenIn.id, plancks: totalIn }, ...fees]
				: NO_AMOUNTS,
		[fees, tokenIn, totalIn],
	);
	const values = useStablePlancksMulti({ inputs: amounts });
	const transferFees = useMemo((): TransferFees | undefined => {
		const [sent, ...valuedFees] = amounts.map((amount, index) => ({
			...amount,
			value: values.data[index]?.stablePlancks,
		}));
		return fees && sent
			? { fees, ...getFeeShare(sent, valuedFees) }
			: undefined;
	}, [fees, amounts, values.data]);
	return {
		transferFees,
		isLoading: amounts.length > 0 && values.isLoading,
	};
};

export const useSwapRisk = ({
	signer,
	route,
	tokenIn,
	tokenOut,
	totalIn,
	plancksOut,
	deliveryFee,
	destinationFee,
	priceImpact,
}: {
	signer: string | undefined;
	route: SwapRoute | null;
	tokenIn: TransferToken;
	tokenOut: TransferToken;
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

	const transfer = useTransferFees({
		route,
		tokenIn,
		tokenOut,
		totalIn,
		received: plancksOut,
		deliveryFee,
	});

	const valueLoss = useMemo((): ValueLoss | undefined => {
		const feeShares = {
			"delivery-fee": getShare(sent.deliveryFeeValue, sent.sentValue) ?? 0,
			"destination-fee":
				getShare(destinationFeeValue.value, sent.sentValue) ?? 0,
		};
		if (transfer.transferFees)
			return {
				kind: "fees",
				ratio: transfer.transferFees.share,
				feeShares,
			};
		const ratio = getValueLoss(sent.sentValue, received.stablePlancks);
		if (ratio === undefined) return undefined;
		return {
			kind: route?.kind === "xcm-transfer" ? "fees" : "value-loss",
			ratio,
			feeShares,
		};
	}, [
		route?.kind,
		transfer.transferFees,
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
		(sent.isLoading ||
			received.isLoading ||
			destinationFeeValue.isLoading ||
			transfer.isLoading);

	return {
		risk,
		transferFees: transfer.transferFees,
		isAcknowledged,
		isAssessing,
		onAcknowledgeChange,
	};
};
