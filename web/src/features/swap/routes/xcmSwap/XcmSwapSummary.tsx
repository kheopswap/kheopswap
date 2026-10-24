import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../../../components/FormSummary";
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
import { RateValue } from "../../RateValue";
import { Slippage } from "../../Slippage";
import { useSwap } from "../../SwapProvider";
import { ProtocolFeeValue, RouteValue } from "../AmmPathValues";
import type {
	XcmDestinationSwapDetails,
	XcmSwapDetails,
} from "../xcm/useXcmRoute";
import { XcmQuoteRows, XcmSimulationValue } from "../xcm/XcmQuoteRows";

type XcmPathSwapDetails = XcmSwapDetails | XcmDestinationSwapDetails;

const getMinReceivedExplanation = ({ route }: XcmPathSwapDetails) => {
	const origin = getChainById(route.origin).name;
	const destination = getChainById(route.destination).name;
	switch (route.kind) {
		case "xcm-swap":
			return `The swap reverts on ${origin} if it would output less than the minimum your slippage tolerance allows. ${destination} then takes its fee from what arrives.`;
		case "xcm-destination-swap":
			return `${destination} takes its fee from what arrives, then swaps the rest. If a step of the swap would output less than the minimum your slippage tolerance allows, the swap stops there and the token it holds at that point goes to your ${destination} account.`;
	}
};

const MinReceivedValue: FC<{ details: XcmPathSwapDetails }> = ({ details }) => {
	const { quote, minReceived } = details;
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
				<p className="max-w-72">{getMinReceivedExplanation(details)}</p>
			</TooltipContent>
		</Tooltip>
	);
};

export const XcmSwapSummary: FC<{ details: XcmPathSwapDetails }> = ({
	details,
}) => {
	const { tokenIn, transaction } = useSwap();
	const { route, quote, pathQuote, priceImpact, slippage } = details;

	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow label="Rate" value={<RateValue />} />
				{route.path.length > 1 && (
					<FormSummaryRow
						label="Route"
						value={<RouteValue path={route.path} />}
					/>
				)}
				<FormSummaryRow
					label="Price impact"
					value={
						priceImpact !== undefined && <PriceImpact value={priceImpact} />
					}
				/>
				<FormSummaryRow
					label="Slippage tolerance"
					value={<Slippage value={slippage} />}
				/>
				<FormSummaryRow
					label="Min. received (est.)"
					value={<MinReceivedValue details={details} />}
				/>
				<XcmQuoteRows quote={quote} />
			</FormSummarySection>
			{!!transaction.call && (
				<FormSummarySection>
					<FormSummaryRow
						label="Simulation"
						value={<XcmSimulationValue quote={quote} route={route} />}
					/>
					<FormSummaryRow
						label="Transaction fee"
						value={<TransactionFeeSummaryValue />}
					/>
					{details.kind === "xcm-swap" && (
						<FormSummaryRow
							label="Service fee"
							value={
								!!tokenIn &&
								isBigInt(details.appCommission) && (
									<Tokens plancks={details.appCommission} token={tokenIn} />
								)
							}
						/>
					)}
					<FormSummaryRow
						label="Protocol fee"
						value={pathQuote && <ProtocolFeeValue quote={pathQuote} />}
					/>
				</FormSummarySection>
			)}
		</FormSummary>
	);
};
