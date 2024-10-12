import type { FC } from "react";

import { Shimmer } from "./Shimmer";
import { Tokens } from "./Tokens";

import type { TokenId } from "@kheopswap/registry";
import { cn, isBigInt } from "@kheopswap/utils";
import { useBalance, useToken } from "src/hooks";

export const Balance: FC<{
	address: string | null | undefined;
	tokenId: TokenId | null | undefined;
	className?: string;
}> = ({ address, tokenId, className }) => {
	const { data: token } = useToken({ tokenId });
	const { data: balance, isLoading } = useBalance({
		address,
		tokenId,
	});

	if (!!token && isBigInt(balance))
		return (
			<Tokens
				plancks={balance}
				token={token}
				pulse={isLoading}
				className={className}
			/>
		);

	return (
		<Shimmer className={cn(className, (!address || !token) && "invisible")}>
			{`0000 ${token?.symbol ?? "AAA"}`}
		</Shimmer>
	);
};
