import type { FC } from "react";
import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../components/FormSummary";
import { Tokens } from "../../components/Tokens";
import { isBigInt } from "../../utils/isBigInt";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { PriceImpact } from "./PriceImpact";
import type { PathLiquidity } from "./routes/ammPath";
import { XcmSwapSummary } from "./routes/xcmSwap/XcmSwapSummary";
import { XcmTransferSummary } from "./routes/xcmTransfer/XcmTransferSummary";
import { Slippage } from "./Slippage";
import { type AmmSwapDetails, useSwap } from "./SwapProvider";

const PoolReservesValue: FC<{ liquidity: PathLiquidity | null }> = ({
	liquidity,
}) => {
	const { tokenIn, tokenOut } = useSwap();
	if (!tokenIn || !tokenOut) return null;

	switch (liquidity?.status) {
		case "no-pool":
			return <div className="text-error">Pool not found</div>;
		case "no-liquidity":
			return <div className="text-error">No liquidity</div>;
		case "available": {
			const [{ reserveIn, reserveOut }] = liquidity.hops;
			return (
				<div className="flex flex-wrap justify-end">
					<Tokens plancks={reserveIn} token={tokenIn} />
					<span className="mx-1">/</span>
					<Tokens plancks={reserveOut} token={tokenOut} />
				</div>
			);
		}
		default:
			return null;
	}
};

const AmmSwapSummary: FC<{ details: AmmSwapDetails }> = ({ details }) => {
	const { tokenIn, tokenOut, transaction } = useSwap();
	const {
		minPlancksOut,
		priceImpact,
		liquidity,
		quote,
		appCommission,
		slippage,
	} = details;
	const { call } = transaction;
	const protocolCommission = quote?.hops[0].protocolCommission;

	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Pool reserves"
					value={<PoolReservesValue liquidity={liquidity} />}
				/>
				<FormSummaryRow
					label="Price impact"
					value={
						priceImpact !== undefined && <PriceImpact value={priceImpact} />
					}
				/>
			</FormSummarySection>
			{!!call && (
				<>
					<FormSummarySection>
						<FormSummaryRow
							label="Slippage tolerance"
							value={<Slippage value={slippage} />}
						/>
						<FormSummaryRow
							label="Min. received"
							value={
								isBigInt(minPlancksOut) &&
								!!tokenOut && (
									<Tokens plancks={minPlancksOut} token={tokenOut} />
								)
							}
						/>
					</FormSummarySection>
					<FormSummarySection>
						<FormSummaryRow
							label="Simulation"
							value={<TransactionDryRunSummaryValue />}
						/>
						<FormSummaryRow
							label="Transaction fee"
							value={<TransactionFeeSummaryValue />}
						/>
						<FormSummaryRow
							label="Service fee"
							value={
								!!tokenIn &&
								isBigInt(minPlancksOut) &&
								isBigInt(appCommission) && (
									<Tokens plancks={appCommission} token={tokenIn} />
								)
							}
						/>
						<FormSummaryRow
							label="Protocol fee"
							value={
								!!tokenIn &&
								isBigInt(minPlancksOut) &&
								isBigInt(protocolCommission) && (
									<Tokens plancks={protocolCommission} token={tokenIn} />
								)
							}
						/>
					</FormSummarySection>
				</>
			)}
		</FormSummary>
	);
};

export const SwapSummary = () => {
	const { details } = useSwap();

	switch (details.kind) {
		case "amm-swap":
			return <AmmSwapSummary details={details} />;
		case "xcm-transfer":
			return <XcmTransferSummary details={details} />;
		case "xcm-swap":
			return <XcmSwapSummary details={details} />;
	}
};
