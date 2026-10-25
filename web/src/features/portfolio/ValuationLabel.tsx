import type { FC } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip/Tooltip";
import { LOW_LIQUIDITY_FLOOR_STABLE_UNITS } from "../../state/prices";
import { useRelayChains } from "../../state/relay";
import { cn } from "../../utils/cn";
import {
	type HoldingValuation,
	isLowLiquidity,
	type UnvaluedStatus,
} from "../../utils/getHoldingValuation";

export const getShownValuationStatus = ({
	status,
	tokenPlancks,
	isPrice,
	isLoadingStablePlancks,
}: {
	status: HoldingValuation["status"];
	tokenPlancks: bigint | null;
	isPrice: boolean;
	isLoadingStablePlancks: boolean;
}): UnvaluedStatus | null =>
	status !== "priced" &&
	tokenPlancks !== 0n &&
	(isLowLiquidity(status) || (!isPrice && !isLoadingStablePlancks))
		? status
		: null;

export const getValuationExplanation = (
	status: UnvaluedStatus,
	isPrice: boolean,
	stableSymbol: string,
) => {
	switch (status) {
		case "thin-pool":
			return isPrice
				? `This token's pool holds under ${LOW_LIQUIDITY_FLOOR_STABLE_UNITS} ${stableSymbol}, so its price is unreliable.`
				: `This token's pool holds under ${LOW_LIQUIDITY_FLOOR_STABLE_UNITS} ${stableSymbol}, so its value can't be estimated reliably. It is not counted in your total.`;
		case "holding-dwarfs-pool":
			return isPrice
				? "This pool is too thin to price the token: selling one token would return under half of its spot value."
				: "Selling this holding would drain its pool and return under half of its spot value. It is not counted in your total.";
		case "unpriced":
			return isPrice
				? "No Asset Hub pool prices this token."
				: "No Asset Hub pool prices this token, so it is not counted in your total.";
	}
};

export const ValuationLabel: FC<{
	status: UnvaluedStatus;
	isPrice?: boolean;
	className?: string;
}> = ({ status, isPrice = false, className }) => {
	const { stableToken } = useRelayChains();
	const explanation = getValuationExplanation(
		status,
		isPrice,
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
