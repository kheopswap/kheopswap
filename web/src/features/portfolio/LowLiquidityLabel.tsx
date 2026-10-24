import type { FC } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip/Tooltip";
import { LOW_LIQUIDITY_FLOOR_STABLE_UNITS } from "../../state/prices";
import { useRelayChains } from "../../state/relay";
import { cn } from "../../utils/cn";

export const LowLiquidityLabel: FC<{ className?: string }> = ({
	className,
}) => {
	const { stableToken } = useRelayChains();

	return (
		<Tooltip>
			<TooltipTrigger render={<span />}>
				<span className={cn("text-warn", className)}>Low liquidity</span>
			</TooltipTrigger>
			<TooltipContent>
				This token's pool holds under {LOW_LIQUIDITY_FLOOR_STABLE_UNITS}{" "}
				{stableToken.symbol}, so its value can't be estimated reliably. It is
				not counted in your total.
			</TooltipContent>
		</Tooltip>
	);
};
