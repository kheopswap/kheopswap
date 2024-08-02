import { FC, ReactNode, useMemo } from "react";

import { Shimmer } from "./Shimmer";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

import { TokenId } from "src/config/tokens";
import { useStablePrice } from "src/hooks";
import { cn, formatDecimals } from "src/util";

export const StablePrice: FC<{
	plancks: bigint | null | undefined;
	tokenId: TokenId | null | undefined;
	prefix?: ReactNode;
	className?: string;
}> = ({ plancks, tokenId, className, prefix }) => {
	const { price, isLoading, stableToken, token } = useStablePrice({
		tokenId,
		plancks,
	});

	const hide = useMemo(
		() => !stableToken || !token || typeof plancks !== "bigint" || !price,
		[plancks, price, stableToken, token],
	);

	if (hide || isLoading)
		return (
			<Shimmer className={cn("inline-block", className, hide && "invisible")}>
				{`0000 ${stableToken?.symbol ?? "USDC"}`}
			</Shimmer>
		);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className={cn("whitespace-nowrap", className)}>
					{prefix}
					{formatDecimals(price, 2)} {stableToken?.symbol}
				</span>
			</TooltipTrigger>
			{price && (
				<TooltipContent>
					{price} {stableToken?.symbol}
				</TooltipContent>
			)}
		</Tooltip>
	);
};
