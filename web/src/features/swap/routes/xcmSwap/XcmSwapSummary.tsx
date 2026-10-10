import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Shimmer } from "../../../../components/Shimmer";
import { Tokens } from "../../../../components/Tokens";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../../../components/tooltip/Tooltip";
import { getChainById } from "../../../../registry/chains/chains";
import { isBigInt } from "../../../../utils/isBigInt";
import { TransactionFeeSummaryValue } from "../../../transaction/TransactionFeeSummaryValue";
import { PriceImpact } from "../../PriceImpact";
import { Slippage } from "../../Slippage";
import { SummaryRow } from "../../SummaryRow";
import { useSwap } from "../../SwapProvider";
import type { XcmSwapDetails } from "../xcm/useXcmRoute";
import { XcmQuoteRows, XcmSimulationValue } from "../xcm/XcmQuoteRows";

const MinReceivedValue: FC<{ details: XcmSwapDetails }> = ({
	details: { route, quote, minReceived },
}) => {
	const { tokenOut } = useSwap();
	if (quote.isLoading) return <Shimmer className="h-4">0.0000 AAA</Shimmer>;
	if (!isBigInt(minReceived) || !tokenOut) return null;

	return (
		<Tooltip placement="bottom-end">
			<TooltipTrigger render={<div />}>
				<div className="flex gap-1 items-center">
					<Tokens plancks={minReceived} token={tokenOut} />
					<InformationCircleIcon className="size-5 inline align-text-bottom" />
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<p className="max-w-72">
					The swap reverts on {getChainById(route.origin).name} if it would
					output less than the minimum your slippage tolerance allows.{" "}
					{getChainById(route.destination).name} then takes its fee from what
					arrives.
				</p>
			</TooltipContent>
		</Tooltip>
	);
};

export const XcmSwapSummary: FC<{ details: XcmSwapDetails }> = ({
	details,
}) => {
	const { tokenIn, transaction } = useSwap();
	const { route, quote, priceImpact, slippage, appCommission } = details;

	return (
		<div className="flex flex-col gap-2">
			<div>
				<SummaryRow
					label="Price impact"
					value={
						priceImpact !== undefined && <PriceImpact value={priceImpact} />
					}
				/>
				<SummaryRow
					label="Slippage tolerance"
					value={<Slippage value={slippage} />}
				/>
				<SummaryRow
					label="Min. received (est.)"
					value={<MinReceivedValue details={details} />}
				/>
				<XcmQuoteRows quote={quote} route={route} />
			</div>
			{!!transaction.call && (
				<div>
					<SummaryRow
						label="Simulation"
						value={<XcmSimulationValue quote={quote} route={route} />}
					/>
					<SummaryRow
						label="Transaction fee"
						value={<TransactionFeeSummaryValue />}
					/>
					<SummaryRow
						label="Service fee"
						value={
							!!tokenIn &&
							isBigInt(appCommission) && (
								<Tokens plancks={appCommission} token={tokenIn} />
							)
						}
					/>
				</div>
			)}
		</div>
	);
};
