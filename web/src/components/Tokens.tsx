import { type FC, useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

import type { Token } from "src/config/tokens";
import { plancksToTokens } from "src/util";
import { N0mb3rz } from "./N0mb3rz";

export const Tokens: FC<{
	plancks: bigint;
	token: Token;
	showSymbol?: boolean;
	digits?: number;
	className?: string;
}> = ({ plancks, token, className, showSymbol = true, digits = 4 }) => {
	const { tooltip, tokens, suffix } = useMemo(() => {
		const tokens = plancksToTokens(plancks, token.decimals);
		// const formatted = formatDecimals(tokens, Math.min(digits, token.decimals));

		const tooltip = `${tokens} ${token.symbol}`;
		//const display = `${formatted}${showSymbol ? ` ${token.symbol}` : ""}`;

		const suffix = showSymbol ? token.symbol : "";

		return {
			tooltip,
			//	display,
			tokens,
			suffix,
		};
	}, [
		//digits,
		plancks,
		showSymbol,
		token.decimals,
		token.symbol,
	]);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{/* <span className={cn("whitespace-nowrap", className)}>{display}</span> */}
				<N0mb3rz
					value={tokens}
					digits={digits}
					suffix={suffix}
					className={className}
				/>
			</TooltipTrigger>
			{tooltip && <TooltipContent>{tooltip}</TooltipContent>}
		</Tooltip>
	);
};
