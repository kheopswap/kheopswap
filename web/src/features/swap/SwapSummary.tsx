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
import { XcmTransferSummary } from "./routes/xcmTransfer/XcmTransferSummary";
import { Slippage } from "./Slippage";
import { type AmmSwapDetails, useSwap } from "./SwapProvider";

const AmmSwapSummary: FC<{ details: AmmSwapDetails }> = ({ details }) => {
	const { tokenIn, tokenOut, transaction } = useSwap();
	const {
		minPlancksOut,
		priceImpact,
		reserveIn,
		reserveOut,
		isPoolNotFound,
		appCommission,
		protocolCommission,
		slippage,
	} = details;
	const { call } = transaction;

	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Pool reserves"
					value={
						isPoolNotFound ? (
							<div className="text-error">Pool not found</div>
						) : reserveIn && reserveOut && tokenIn && tokenOut ? (
							<div className="flex flex-wrap justify-end">
								<Tokens plancks={reserveIn} token={tokenIn} />
								<span className="mx-1">/</span>
								<Tokens plancks={reserveOut} token={tokenOut} />
							</div>
						) : tokenIn &&
							tokenOut &&
							(reserveIn === 0n || reserveOut === 0n) ? (
							<div className="text-error">No liquidity</div>
						) : null
					}
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
	}
};
