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

		return {
			tokens,
			tooltip: `${tokens} ${token.symbol}`,
			suffix: showSymbol ? token.symbol : undefined,
		};
	}, [plancks, showSymbol, token.decimals, token.symbol]);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
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
