import type { Token } from "@kheopswap/registry";
import { cn, isBigInt } from "@kheopswap/utils";
import type { FC } from "react";
import { Shimmer, Tokens } from "src/components";
import type { BalanceWithStableSummary } from "src/types";

export const TokenBalancesSummary: FC<
	BalanceWithStableSummary & {
		token: Token;
		stableToken: Token | undefined;
		isPrice?: boolean;
	}
> = ({
	token,
	stableToken,
	tokenPlancks,
	isLoadingStablePlancks,
	stablePlancks,
	isLoadingTokenPlancks,
	isInitializing,
	isPrice,
}) => {
	if (!isInitializing && !tokenPlancks) return null;

	if (isInitializing)
		return (
			<div
				className={cn(
					"flex size-full flex-col items-end justify-center gap-1 overflow-hidden",
				)}
			>
				<div>
					<Shimmer className="h-5 overflow-hidden">0.0001 TKN</Shimmer>
				</div>
				<div>
					<Shimmer className="h-4 overflow-hidden text-sm">0.00 USDC</Shimmer>
				</div>
			</div>
		);

	return (
		<div className="flex size-full flex-col items-end justify-center overflow-hidden">
			<div className="truncate">
				<Tokens
					token={token}
					plancks={tokenPlancks ?? 0n}
					pulse={isLoadingTokenPlancks}
					isPrice={isPrice}
				/>
			</div>
			<div className="truncate text-sm text-neutral-500">
				{stableToken && (
					<Tokens
						token={stableToken}
						plancks={stablePlancks ?? 0n}
						pulse={isLoadingStablePlancks}
						digits={2}
						isPrice={isPrice}
						className={cn(
							!isBigInt(stablePlancks) && "invisible",
							token.id === stableToken.id && "invisible",
						)}
					/>
				)}
			</div>
		</div>
	);
};
