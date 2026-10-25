import type { FC, ReactNode } from "react";
import { StableValue } from "../../components/StableValue";
import { Tokens } from "../../components/Tokens";
import {
	getShownValuationStatus,
	ValuationLabel,
} from "../../components/ValuationLabel";
import type { Token } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import type { BalanceWithStableSummary } from "../../types/balances";
import { hasValueLine, useIsValuedAsStable } from "../../utils/hasValueLine";

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
	const isValuedAsStable = useIsValuedAsStable(token.id);

	if (isInitializing) return null;

	const plancks = tokenPlancks ?? 0n;
	const subject = isPrice ? "price" : "holding";
	const showValue = hasValueLine(isValuedAsStable, plancks);
	const labelStatus = getShownValuationStatus({
		status: valuation.status,
		tokenPlancks: plancks,
		subject,
		isLoadingStablePlancks,
	});

	return (
		<div className="flex gap-2 whitespace-nowrap text-text">
			<Tokens
				token={token}
				plancks={plancks}
				pulse={isLoadingTokenPlancks}
				isPrice={isPrice}
			/>
			{labelStatus && (
				<ValuationLabel
					status={labelStatus}
					subject={subject}
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
