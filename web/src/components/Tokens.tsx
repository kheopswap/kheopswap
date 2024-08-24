import { type FC, useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

import type { Token } from "src/config/tokens";
import { cn, formatDecimals, plancksToTokens } from "src/util";
import { Pulse } from "./Pulse";

export const Tokens: FC<{
	plancks: bigint;
	token: Token;
	showSymbol?: boolean;
	digits?: number;
	className?: string;
	pulse?: boolean;
}> = ({ plancks, token, pulse, className, showSymbol = true, digits = 4 }) => {
	const { tooltip, display } = useMemo(() => {
		const tokens = plancksToTokens(plancks, token.decimals);
		const formatted = formatDecimals(tokens, Math.min(digits, token.decimals));

		const tooltip = `${tokens} ${token.symbol}`;
		const display = `${formatted}${showSymbol ? ` ${token.symbol}` : ""}`;

		return {
			tooltip,
			display,
		};
	}, [digits, plancks, showSymbol, token.decimals, token.symbol]);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Pulse
					as="span"
					pulse={pulse}
					className={cn("whitespace-nowrap", className)}
				>
					{display}
				</Pulse>
			</TooltipTrigger>
			{tooltip && <TooltipContent>{tooltip}</TooltipContent>}
		</Tooltip>
	);
};
