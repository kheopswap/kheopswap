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
import { Slippage } from "./Slippage";
import { useSwap } from "./SwapProvider";

export const SwapSummary = () => {
	const {
		minPlancksOut,
		tokenIn,
		tokenOut,
		priceImpact,
		reserveIn,
		reserveOut,
		isPoolNotFound,
		appCommission,
		protocolCommission,
		slippage,
		call,
	} = useSwap();

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
