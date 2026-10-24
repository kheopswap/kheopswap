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
	isLowLiquidity,
	type UnvaluedStatus,
} from "../../utils/getHoldingValuation";

const useExplanation = (status: UnvaluedStatus, isPrice: boolean) => {
	const { stableToken } = useRelayChains();
	switch (status) {
		case "thin-pool":
			return `This token's pool holds under ${LOW_LIQUIDITY_FLOOR_STABLE_UNITS} ${stableToken.symbol}, so its value can't be estimated reliably. It is not counted in your total.`;
		case "holding-dwarfs-pool":
			return isPrice
				? "This pool is too thin to price the token: selling one token would return under half of its spot value."
				: "Selling this holding would drain its pool and return under half of its spot value. It is not counted in your total.";
		case "unpriced":
			return "No Asset Hub pool prices this token, so it is not counted in your total.";
	}
};

export const ValuationLabel: FC<{
	status: UnvaluedStatus;
	isPrice?: boolean;
	className?: string;
}> = ({ status, isPrice = false, className }) => {
	const explanation = useExplanation(status, isPrice);

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
