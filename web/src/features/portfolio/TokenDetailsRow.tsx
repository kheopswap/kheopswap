import type { FC, ReactNode } from "react";
import { StableValue } from "../../components/StableValue";
import { Tokens } from "../../components/Tokens";
import type { Token } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import type { BalanceWithStableSummary } from "../../types/balances";
import { isLowLiquidity } from "../../utils/getHoldingValuation";
import { hasValueLine } from "../../utils/hasValueLine";
import { ValuationLabel } from "./ValuationLabel";

export const TokenDetailsRow: FC<{
	label: ReactNode;
	children?: ReactNode;
}> = ({ label, children }) => (
	<div className="flex w-full justify-between gap-4 overflow-hidden items-center h-7">
		<div className="text-muted">{label}</div>
		<div className="overflow-hidden">{children}</div>
	</div>
);

export const TokenDetailsRowValue: FC<
	BalanceWithStableSummary & {
		token: Token;
		isPrice?: boolean;
	}
> = ({
	token,
	tokenPlancks,
	isLoadingStablePlancks,
	isLoadingTokenPlancks,
	isInitializing,
	isPrice = false,
	...valuation
}) => {
	const { stableToken } = useRelayChains();

	if (isInitializing) return null;

	const plancks = tokenPlancks ?? 0n;
	const showValue = hasValueLine(token.id, stableToken.id, plancks);
	const showLabel =
		showValue &&
		valuation.status !== "priced" &&
		(isLowLiquidity(valuation.status) || (!isPrice && !isLoadingStablePlancks));

	return (
		<div className="flex gap-2 whitespace-nowrap text-text">
			<Tokens
				token={token}
				plancks={plancks}
				pulse={isLoadingTokenPlancks}
				isPrice={isPrice}
			/>
			{valuation.status !== "priced" && showLabel && (
				<ValuationLabel
					status={valuation.status}
					isPrice={isPrice}
					className="text-xs"
				/>
			)}
			{valuation.status === "priced" && showValue && (
				<span className="text-muted">
					{isPrice ? (
						<Tokens
							token={stableToken}
							plancks={valuation.stablePlancks}
							pulse={isLoadingStablePlancks}
							isPrice
						/>
					) : (
						<StableValue
							stableToken={stableToken}
							plancks={valuation.stablePlancks}
							pulse={isLoadingStablePlancks}
						/>
					)}
				</span>
			)}
		</div>
	);
};
