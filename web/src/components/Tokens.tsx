import { type FC, useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

import type { Token } from "src/config/tokens";
import { cn, formatDecimals, plancksToTokens } from "src/util";
import { Pulse } from "./Pulse";
import { Price } from "./SmallNumber";

export type TokenProps = {
	plancks: bigint;
	token: Token;
	showSymbol?: boolean;
	digits?: number;
	className?: string;
	pulse?: boolean;
	isPrice?: boolean;
};

export const Tokens: FC<TokenProps> = (props) => {
	// prices use exact/sub notation, normal rounds value below x digits
	return props.isPrice ? (
		<TokenPrice {...props} />
	) : (
		<NormalTokens {...props} />
	);
};

const NormalTokens: FC<TokenProps> = ({
	plancks,
	token,
	pulse,
	className,
	showSymbol = true,
	digits = 4,
}) => {
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

const TokenPrice: FC<TokenProps> = ({
	plancks,
	token,
	pulse,
	className,
	showSymbol = true,
	digits = 4,
}) => {
	const { tooltip, tokens, suffix } = useMemo(() => {
		const { tokens, lowerThan } = plancks
			? { tokens: plancksToTokens(plancks, token.decimals), lowerThan: false }
			: { tokens: plancksToTokens(1n, token.decimals), lowerThan: true };

		return {
			tokens,
			tooltip: `${lowerThan ? "< " : ""}${tokens} ${token.symbol}`,
			suffix: showSymbol ? token.symbol : undefined,
		};
	}, [plancks, showSymbol, token.decimals, token.symbol]);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Pulse
					as="span"
					pulse={pulse}
					className={cn("whitespace-nowrap", className)}
				>
					<Price
						value={tokens}
						digits={digits}
						suffix={suffix}
						decimals={token.decimals}
					/>
				</Pulse>
			</TooltipTrigger>
			{tooltip && <TooltipContent>{tooltip}</TooltipContent>}
		</Tooltip>
	);
};
