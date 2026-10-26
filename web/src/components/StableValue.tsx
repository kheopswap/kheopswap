import type { FC } from "react";
import type { Token } from "../registry/tokens/types";
import { cn } from "../utils/cn";
import { formatStableValue } from "../utils/formatDecimals";
import { plancksToTokens } from "../utils/plancks";
import { Pulse } from "./Pulse";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

export const StableValue: FC<{
	plancks: bigint;
	stableToken: Token;
	pulse?: boolean;
	className?: string;
}> = ({ plancks, stableToken, pulse, className }) => {
	const tokens = plancksToTokens(plancks, stableToken.decimals);

	return (
		<Tooltip>
			<TooltipTrigger render={<span />}>
				<Pulse
					as="span"
					pulse={pulse}
					className={cn("whitespace-nowrap font-mono", className)}
				>
					{formatStableValue(tokens)} {stableToken.symbol}
				</Pulse>
			</TooltipTrigger>
			<TooltipContent>
				{tokens} {stableToken.symbol}
			</TooltipContent>
		</Tooltip>
	);
};
