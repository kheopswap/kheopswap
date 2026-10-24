import type { FC } from "react";
import { Shimmer } from "../../components/Shimmer";
import { Tokens } from "../../components/Tokens";
import type { Token } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";
import { cn } from "../../utils/cn";
import { isLowLiquidity } from "../../utils/getHoldingValuation";
import { ValuationLabel } from "./ValuationLabel";

const ValueLine: FC<
	BalanceWithStableSummary & {
		token: Token;
		stableToken: Token;
		isPrice: boolean;
	}
> = ({ token, stableToken, isPrice, isLoadingStablePlancks, ...valuation }) => {
	const showLabel =
		valuation.status !== "priced" &&
		(isLowLiquidity(valuation.status) || (!isPrice && !isLoadingStablePlancks));

	if (valuation.status !== "priced" && showLabel)
		return <ValuationLabel status={valuation.status} isPrice={isPrice} />;

	return (
		<Tokens
			token={stableToken}
			plancks={valuation.stablePlancks ?? 0n}
			pulse={isLoadingStablePlancks}
			digits={2}
			isPrice={isPrice}
			className={cn(
				(valuation.status !== "priced" || token.id === stableToken.id) &&
					"invisible",
			)}
		/>
	);
};

export const TokenBalancesSummary: FC<
	BalanceWithStableSummary & {
		token: Token;
		stableToken: Token;
		isPrice?: boolean;
	}
> = ({ isPrice = false, ...props }) => {
	const { token, tokenPlancks, isLoadingTokenPlancks, isInitializing } = props;

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
					<Shimmer className="h-4 overflow-hidden text-xs">0.00 USDC</Shimmer>
				</div>
			</div>
		);

	return (
		<div className="flex size-full flex-col items-end justify-center overflow-hidden">
			<div className="truncate font-semibold">
				<Tokens
					token={token}
					plancks={tokenPlancks ?? 0n}
					pulse={isLoadingTokenPlancks}
					isPrice={isPrice}
				/>
			</div>
			<div className="truncate text-xs text-muted">
				<ValueLine {...props} isPrice={isPrice} />
			</div>
		</div>
	);
};
