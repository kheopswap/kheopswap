import { useMemo } from "react";
import { isBigInt } from "../../utils/isBigInt";
import { provideContext } from "../../utils/provideContext";
import { useTransaction } from "../transaction/TransactionProvider";
import { useSwap } from "./SwapProvider";
import { getRiskSubmitGate } from "./swapRisk";
import { useSwapRisk } from "./useSwapRisk";

const useSwapRiskProvider = () => {
	const {
		from,
		route,
		tokenIn,
		tokenOut,
		totalIn,
		swapPlancksOut,
		details,
		transaction,
	} = useSwap();
	const { feeToken, feeEstimate } = useTransaction();

	const transactionFee = useMemo(
		() =>
			feeToken && isBigInt(feeEstimate)
				? { tokenId: feeToken.id, plancks: feeEstimate }
				: undefined,
		[feeToken, feeEstimate],
	);
	const xcm = details.kind === "amm-swap" ? undefined : details;

	const risk = useSwapRisk({
		signer: from,
		route,
		tokenIn,
		tokenOut,
		totalIn,
		plancksOut: swapPlancksOut,
		deliveryFee: xcm?.quote.deliveryFee,
		destinationFee: xcm?.quote.data?.success
			? xcm.quote.data.quote.destinationFee
			: undefined,
		transactionFee,
		priceImpact:
			details.kind === "xcm-transfer" ? undefined : details.priceImpact,
	});

	const submitGate = useMemo(
		() =>
			getRiskSubmitGate(transaction.submitGate, {
				risk: risk.risk,
				isAssessing: risk.isAssessing,
				isAcknowledged: risk.isAcknowledged,
			}),
		[transaction.submitGate, risk.risk, risk.isAssessing, risk.isAcknowledged],
	);

	return { ...risk, submitGate };
};

export const [SwapRiskProvider, useSwapRiskContext] =
	provideContext(useSwapRiskProvider);
