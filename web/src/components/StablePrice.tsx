import { type FC, useMemo } from "react";

import { Shimmer } from "./Shimmer";

import type { TokenId } from "src/config/tokens";
import { useStablePlancks } from "src/hooks";
import { cn } from "src/util";
import { Tokens } from "./Tokens";

export const StablePrice: FC<{
	plancks: bigint | null | undefined;
	tokenId: TokenId | null | undefined;
	className?: string;
}> = ({ plancks, tokenId, className }) => {
	const { stablePlancks, isLoading, stableToken, token } = useStablePlancks({
		tokenId,
		plancks,
	});

	const hide = useMemo(
		() =>
			!stableToken || !token || typeof plancks !== "bigint" || !stablePlancks,
		[plancks, stablePlancks, stableToken, token],
	);

	if (
		isLoading ||
		!stableToken ||
		!token ||
		typeof plancks !== "bigint" ||
		!stablePlancks
	)
		return (
			<Shimmer className={cn("inline-block", className, hide && "invisible")}>
				{`0000 ${stableToken?.symbol ?? "USDC"}`}
			</Shimmer>
		);

	return (
		<Tokens
			plancks={stablePlancks}
			token={stableToken}
			digits={2}
			showSymbol
			className={className}
		/>
	);
};
