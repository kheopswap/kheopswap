import type { FC } from "react";
import { Shimmer } from "../../components/Shimmer";
import { StableValue } from "../../components/StableValue";
import { Tokens } from "../../components/Tokens";
import type { Token } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";
import { cn } from "../../utils/cn";
import { hasValueLine, useIsValuedAsStable } from "../../utils/hasValueLine";
import { getShownValuationStatus, ValuationLabel } from "./ValuationLabel";

const ValueLine: FC<
	BalanceWithStableSummary & {
		token: Token;
		stableToken: Token;
		isPrice: boolean;
	}
> = ({ token, stableToken, isPrice, isLoadingStablePlancks, ...valuation }) => {
	const isValuedAsStable = useIsValuedAsStable(token.id);
	const showValue = hasValueLine(isValuedAsStable, valuation.tokenPlancks);
	const labelStatus = getShownValuationStatus({
		...valuation,
		isPrice,
		isLoadingStablePlancks,
	});

	if (labelStatus)
		return <ValuationLabel status={labelStatus} isPrice={isPrice} />;

	const className = cn(
		(valuation.status !== "priced" || !showValue) && "invisible",
	);
	const plancks = valuation.stablePlancks ?? 0n;

	return isPrice ? (
		<Tokens
			token={stableToken}
			plancks={plancks}
			pulse={isLoadingStablePlancks}
			isPrice
			className={className}
		/>
	) : (
		<StableValue
			stableToken={stableToken}
			plancks={plancks}
			pulse={isLoadingStablePlancks}
			className={className}
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
