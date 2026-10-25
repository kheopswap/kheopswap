import type { FC } from "react";
import { LOW_LIQUIDITY_FLOOR_STABLE_UNITS } from "../state/prices";
import { useRelayChains } from "../state/relay";
import { cn } from "../utils/cn";
import {
	type HoldingValuation,
	isLowLiquidity,
	type UnvaluedStatus,
} from "../utils/getHoldingValuation";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

export type ValuationSubject = "price" | "holding" | "amount";

export const getShownValuationStatus = ({
	status,
	tokenPlancks,
	subject,
	isLoadingStablePlancks,
}: {
	status: HoldingValuation["status"];
	tokenPlancks: bigint | null;
	subject: ValuationSubject;
	isLoadingStablePlancks: boolean;
}): UnvaluedStatus | null =>
	status !== "priced" &&
	tokenPlancks !== 0n &&
	(isLowLiquidity(status) || (subject === "holding" && !isLoadingStablePlancks))
		? status
		: null;

export const getValuationExplanation = (
	status: UnvaluedStatus,
	subject: ValuationSubject,
	stableSymbol: string,
) => {
	switch (status) {
		case "thin-pool":
			return {
				price: `This token's pool holds under ${LOW_LIQUIDITY_FLOOR_STABLE_UNITS} ${stableSymbol}, so its price is unreliable.`,
				holding: `This token's pool holds under ${LOW_LIQUIDITY_FLOOR_STABLE_UNITS} ${stableSymbol}, so its value can't be estimated reliably. It is not counted in your total.`,
				amount: `This token's pool holds under ${LOW_LIQUIDITY_FLOOR_STABLE_UNITS} ${stableSymbol}, so this amount's value can't be estimated reliably.`,
			}[subject];
		case "holding-dwarfs-pool":
			return {
				price:
					"This pool is too thin to price the token: selling one token would return under half of its spot value.",
				holding:
					"Selling this holding would drain its pool and return under half of its spot value. It is not counted in your total.",
				amount:
					"Selling this amount would drain its pool and return under half of its spot value.",
			}[subject];
		case "unpriced":
			return {
				price: "No Asset Hub pool prices this token.",
				holding:
					"No Asset Hub pool prices this token, so it is not counted in your total.",
				amount: "No Asset Hub pool prices this token.",
			}[subject];
	}
};

export const ValuationLabel: FC<{
	status: UnvaluedStatus;
	subject: ValuationSubject;
	className?: string;
}> = ({ status, subject, className }) => {
	const { stableToken } = useRelayChains();
	const explanation = getValuationExplanation(
		status,
		subject,
		stableToken.symbol,
	);

	return (
		<Tooltip>
			<TooltipTrigger render={<span />}>
				<span
					className={cn(
						isLowLiquidity(status) ? "text-warn" : "text-muted",
						className,
					)}
				>
					{isLowLiquidity(status) ? "Low liquidity" : "No price"}
				</span>
			</TooltipTrigger>
			<TooltipContent>{explanation}</TooltipContent>
		</Tooltip>
	);
};
