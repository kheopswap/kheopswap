import type { FC } from "react";
import { Tokens } from "../../components/Tokens";
import { isBigInt } from "../../utils/isBigInt";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { PriceImpact } from "./PriceImpact";
import { XcmTransferSummary } from "./routes/xcmTransfer/XcmTransferSummary";
import { Slippage } from "./Slippage";
import { SummaryRow } from "./SummaryRow";
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
		<div className="flex flex-col gap-2">
			<div>
				<SummaryRow
					label="Pool reserves"
					value={
						isPoolNotFound ? (
							<div className="text-error-500">Pool not found</div>
						) : reserveIn && reserveOut && tokenIn && tokenOut ? (
							<div className="flex flex-wrap justify-end">
								<Tokens plancks={reserveIn} token={tokenIn} />
								<span className="mx-1">/</span>
								<Tokens plancks={reserveOut} token={tokenOut} />
							</div>
						) : tokenIn &&
							tokenOut &&
							(reserveIn === 0n || reserveOut === 0n) ? (
							<div className="text-error-500">No liquidity</div>
						) : null
					}
				/>
				<SummaryRow
					label="Price impact"
					value={
						priceImpact !== undefined && <PriceImpact value={priceImpact} />
					}
				/>
			</div>
			{!!call && (
				<>
					<div>
						<SummaryRow
							label="Slippage tolerance"
							value={<Slippage value={slippage} />}
						/>
						<SummaryRow
							label="Min. received"
							value={
								isBigInt(minPlancksOut) &&
								!!tokenOut && (
									<Tokens plancks={minPlancksOut} token={tokenOut} />
								)
							}
						/>
					</div>
					<div>
						<SummaryRow
							label="Simulation"
							value={<TransactionDryRunSummaryValue />}
						/>
						<SummaryRow
							label="Transaction fee"
							value={<TransactionFeeSummaryValue />}
						/>
						<SummaryRow
							label="Service fee"
							value={
								!!tokenIn &&
								isBigInt(minPlancksOut) &&
								isBigInt(appCommission) && (
									<Tokens plancks={appCommission} token={tokenIn} />
								)
							}
						/>
						<SummaryRow
							label="Protocol fee"
							value={
								!!tokenIn &&
								isBigInt(minPlancksOut) &&
								isBigInt(protocolCommission) && (
									<Tokens plancks={protocolCommission} token={tokenIn} />
								)
							}
						/>
					</div>
				</>
			)}
		</div>
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
