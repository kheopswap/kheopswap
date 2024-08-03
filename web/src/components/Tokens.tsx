import { type FC, useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

import type { Token } from "src/config/tokens";
import { cn, formatDecimals, plancksToTokens } from "src/util";

export const Tokens: FC<{
	plancks: bigint;
	token: Token;
	showSymbol?: boolean;
	digits?: number;
	className?: string;
}> = ({ plancks, token, className, showSymbol = true, digits = 4 }) => {
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
				<span className={cn("whitespace-nowrap", className)}>{display}</span>
			</TooltipTrigger>
			{tooltip && <TooltipContent>{tooltip}</TooltipContent>}
		</Tooltip>
	);
};
