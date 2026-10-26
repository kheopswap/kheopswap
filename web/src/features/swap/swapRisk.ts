import type { Token, TokenAmount } from "../../registry/tokens/types";
import { mergeTokenAmounts } from "../../utils/mergeTokenAmounts";
import type { SubmitGate } from "../transaction/TransactionProvider";

export type SwapLoss = {
	kind: "price-impact" | "value-loss" | "fees";
	ratio: number;
};

const FEE_CAUSES = ["delivery-fee", "destination-fee"] as const;

type FeeCause = (typeof FEE_CAUSES)[number];

export type ValueLoss = {
	kind: "value-loss" | "fees";
	ratio: number;
	feeShares: Record<FeeCause, number>;
};

type RiskLevel = "warn" | "confirm";

export type LossCause = "price-impact" | FeeCause;

export type SwapRisk =
	| { level: "none" }
	| {
			level: RiskLevel;
			losses: SwapLoss[];
			headline: SwapLoss;
			cause: LossCause | null;
	  };

export type RiskAcknowledgement = { key: string; losses: SwapLoss[] };

const VALUE_LOSS_THRESHOLDS = { warn: 0.03, confirm: 0.15 };

const LOSS_THRESHOLDS: Record<SwapLoss["kind"], Record<RiskLevel, number>> = {
	"price-impact": { warn: 0.05, confirm: 0.15 },
	"value-loss": VALUE_LOSS_THRESHOLDS,
	fees: VALUE_LOSS_THRESHOLDS,
};

const NO_RISK: SwapRisk = { level: "none" };

const RATIO_PRECISION = 1_000_000n;

export const getShare = (
	part: bigint | null | undefined,
	whole: bigint | null | undefined,
): number | undefined => {
	if (!whole || part === null || part === undefined) return undefined;
	return Number((part * RATIO_PRECISION) / whole) / Number(RATIO_PRECISION);
};

export const getValueLoss = (
	sentValue: bigint | null | undefined,
	receivedValue: bigint | null | undefined,
): number | undefined =>
	receivedValue === null || receivedValue === undefined
		? undefined
		: getShare(sentValue && sentValue - receivedValue, sentValue);

const isMostOf = (share: number, loss: SwapLoss) => share > loss.ratio / 2;

const getLossCause = (
	headline: SwapLoss,
	priceImpactLoss: number,
	valueLoss: ValueLoss | undefined,
): LossCause | null => {
	if (headline.kind === "price-impact" || !valueLoss) return null;
	const feeCause = FEE_CAUSES.find((cause) =>
		isMostOf(valueLoss.feeShares[cause], headline),
	);
	if (feeCause) return feeCause;
	if (headline.kind === "value-loss" && isMostOf(priceImpactLoss, headline))
		return "price-impact";
	return null;
};

export const getSwapRisk = ({
	priceImpact,
	valueLoss,
}: {
	priceImpact: number | undefined;
	valueLoss: ValueLoss | undefined;
}): SwapRisk => {
	const priceImpactLoss = -(priceImpact ?? 0);
	const losses: SwapLoss[] = [
		{ kind: "price-impact" as const, ratio: priceImpactLoss },
		...(valueLoss ? [{ kind: valueLoss.kind, ratio: valueLoss.ratio }] : []),
	].filter(({ kind, ratio }) => ratio > LOSS_THRESHOLDS[kind].warn);
	const [headline] = [...losses].sort((a, b) => b.ratio - a.ratio);
	if (!headline) return NO_RISK;

	const needsConfirmation = losses.some(
		({ kind, ratio }) => ratio > LOSS_THRESHOLDS[kind].confirm,
	);
	return {
		level: needsConfirmation ? "confirm" : "warn",
		losses,
		headline,
		cause: getLossCause(headline, priceImpactLoss, valueLoss),
	};
};

const coversRisk = (
	acknowledgement: RiskAcknowledgement,
	risk: SwapRisk,
	key: string,
): boolean =>
	acknowledgement.key === key &&
	(risk.level === "none" ||
		risk.losses.every(
			({ kind, ratio }) =>
				ratio <=
				(acknowledgement.losses.find((loss) => loss.kind === kind)?.ratio ?? 0),
		));

export const isRiskAcknowledged = (
	risk: SwapRisk,
	acknowledgement: RiskAcknowledgement | null,
	key: string,
): boolean =>
	risk.level !== "confirm" ||
	(!!acknowledgement && coversRisk(acknowledgement, risk, key));

export const isAcknowledgementStale = (
	acknowledgement: RiskAcknowledgement | null,
	risk: SwapRisk,
	key: string,
): boolean => !!acknowledgement && !coversRisk(acknowledgement, risk, key);

export const isTransferRisk = (risk: SwapRisk) =>
	risk.level !== "none" && risk.headline.kind === "fees";

export const getTransferFees = ({
	tokenIn,
	tokenOut,
	totalIn,
	received,
	deliveryFee,
	transactionFee,
}: {
	tokenIn: Pick<Token, "id" | "decimals"> | null | undefined;
	tokenOut: Pick<Token, "decimals"> | null | undefined;
	totalIn: bigint | null | undefined;
	received: bigint | null | undefined;
	deliveryFee: TokenAmount | undefined;
	transactionFee: TokenAmount | undefined;
}): TokenAmount[] | undefined => {
	if (
		!tokenIn ||
		!tokenOut ||
		!totalIn ||
		received === null ||
		received === undefined ||
		received > totalIn ||
		tokenIn.decimals !== tokenOut.decimals
	)
		return undefined;
	return mergeTokenAmounts(
		[
			{ tokenId: tokenIn.id, plancks: totalIn - received },
			deliveryFee,
			transactionFee,
		].filter((fee) => !!fee),
	);
};

export type ValuedAmount = TokenAmount & { value: bigint | null | undefined };

export const getFeeShare = (
	sent: ValuedAmount,
	fees: ValuedAmount[],
): number | undefined => {
	let share = 0;
	for (const fee of fees) {
		const feeShare =
			fee.tokenId === sent.tokenId
				? getShare(fee.plancks, sent.plancks)
				: getShare(fee.value, sent.value);
		if (feeShare === undefined) return undefined;
		share += feeShare;
	}
	return share;
};

export const getRiskSubmitGate = (
	gate: SubmitGate,
	{
		risk,
		isAssessing,
		isAcknowledged,
	}: { risk: SwapRisk; isAssessing: boolean; isAcknowledged: boolean },
): SubmitGate => {
	if (gate.status !== "open") return gate;
	if (isAssessing) return { status: "pending" };
	if (isAcknowledged) return gate;
	return {
		status: "closed",
		reason: isTransferRisk(risk)
			? "Accept the fees to transfer anyway"
			: "Confirm the loss to swap anyway",
	};
};
