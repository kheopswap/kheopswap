import type { SubmitGate } from "../transaction/TransactionProvider";

export type SwapLoss = { kind: "price-impact" | "value-loss"; ratio: number };

type RiskLevel = "warn" | "confirm";

export type SwapRisk =
	| { level: "none" }
	| { level: RiskLevel; losses: SwapLoss[]; worstRatio: number };

export type RiskAcknowledgement = { key: string; ratio: number };

const LOSS_THRESHOLDS: Record<SwapLoss["kind"], Record<RiskLevel, number>> = {
	"price-impact": { warn: 0.05, confirm: 0.15 },
	"value-loss": { warn: 0.03, confirm: 0.15 },
};

const NO_RISK: SwapRisk = { level: "none" };

const RATIO_PRECISION = 1_000_000n;

export const getValueLoss = (
	sentValue: bigint | null | undefined,
	receivedValue: bigint | null | undefined,
): number | undefined => {
	if (!sentValue || receivedValue === null || receivedValue === undefined)
		return undefined;
	const lost = ((sentValue - receivedValue) * RATIO_PRECISION) / sentValue;
	return Number(lost) / Number(RATIO_PRECISION);
};

export const getSwapRisk = ({
	priceImpact,
	valueLoss,
}: {
	priceImpact: number | undefined;
	valueLoss: number | undefined;
}): SwapRisk => {
	const losses: SwapLoss[] = [
		{ kind: "price-impact" as const, ratio: -(priceImpact ?? 0) },
		{ kind: "value-loss" as const, ratio: valueLoss ?? 0 },
	].filter(({ kind, ratio }) => ratio > LOSS_THRESHOLDS[kind].warn);
	if (!losses.length) return NO_RISK;

	const needsConfirmation = losses.some(
		({ kind, ratio }) => ratio > LOSS_THRESHOLDS[kind].confirm,
	);
	return {
		level: needsConfirmation ? "confirm" : "warn",
		losses,
		worstRatio: Math.max(...losses.map(({ ratio }) => ratio)),
	};
};

export const isRiskAcknowledged = (
	risk: SwapRisk,
	acknowledgement: RiskAcknowledgement | null,
	key: string,
): boolean =>
	risk.level !== "confirm" ||
	(acknowledgement?.key === key && risk.worstRatio <= acknowledgement.ratio);

export const getRiskSubmitGate = (
	gate: SubmitGate,
	isAcknowledged: boolean,
): SubmitGate =>
	gate.status === "open" && !isAcknowledged
		? { status: "closed", reason: "Confirm the loss to swap anyway" }
		: gate;
