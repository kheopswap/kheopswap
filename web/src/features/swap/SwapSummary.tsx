import type { FC, ReactNode } from "react";

import { PriceImpact } from "./PriceImpact";
import { Slippage } from "./Slippage";
import { useSwap } from "./SwapProvider";

import { isBigInt } from "@kheopswap/utils";
import { Tokens } from "src/components";
import { TransactionFeeSummaryValue } from "src/features/transaction/TransactionFeeSummaryValue";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";

const SummaryRow: FC<{ label: ReactNode; value: ReactNode }> = ({
	label,
	value,
}) => (
	<div className="flex w-full items-center gap-2 overflow-hidden">
		<div className="grow truncate text-neutral-500">{label}</div>
		<div className="shrink-0 text-right">{value}</div>
	</div>
);

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
		<div className="flex flex-col gap-2">
			<div>
				<SummaryRow
					label="Pool reserves"
					value={
						isPoolNotFound ? (
							<div className="text-error-500">Pool not found</div>
						) : !!reserveIn && !!reserveOut && !!tokenIn && !!tokenOut ? (
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
							label="Kheopswap commission"
							value={
								!!tokenIn &&
								isBigInt(minPlancksOut) &&
								isBigInt(appCommission) && (
									<Tokens plancks={appCommission} token={tokenIn} />
								)
							}
						/>
						<SummaryRow
							label="Pool commission"
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
