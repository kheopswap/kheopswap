import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { compact } from "lodash-es";
import type { FC } from "react";
import { FormSummaryRow } from "../../../../components/FormSummary";
import { Shimmer } from "../../../../components/Shimmer";
import { Tokens } from "../../../../components/Tokens";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../../../components/tooltip/Tooltip";
import { getChainById } from "../../../../registry/chains/chains";
import { cn } from "../../../../utils/cn";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { useSwap } from "../../SwapProvider";
import { TokenAmountValue } from "../AmmPathValues";
import { getXcmHub, type XcmRoute } from "../swapRoute";
import { isBridgeLane } from "../xcmLanes";
import type { XcmQuoteState } from "./useXcmQuote";
import { describeXcmQuoteFailure } from "./xcmQuote";

export const getXcmChainNames = (route: XcmRoute) =>
	compact([route.origin, getXcmHub(route), route.destination]).map(
		(chainId) => getChainById(chainId).name,
	);

export const XcmSimulationValue: FC<{
	quote: XcmQuoteState;
	route: XcmRoute;
}> = ({ quote, route }) => {
	const { isLoading, isDryRunConclusive } = useTransaction();
	if (quote.isLoading || isLoading)
		return <Shimmer className="h-4">Success</Shimmer>;
	if (!quote.data) return null;
	const [origin, ...hops] = getXcmChainNames(route);
	const isSuccess = quote.data.success;

	return (
		<Tooltip placement="bottom-end">
			<TooltipTrigger render={<div />}>
				<div
					className={cn(
						"flex gap-1 items-center",
						!isSuccess && "text-warn",
						isSuccess && !isDryRunConclusive && "text-muted",
					)}
				>
					<span>
						{!isSuccess
							? "Failed"
							: isDryRunConclusive
								? "Success"
								: "Succeeds before fees"}
					</span>
					<InformationCircleIcon className="size-5 inline align-text-bottom" />
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<div className="max-w-72">
					{!quote.data.success && (
						<div className="mb-2 text-error">
							{describeXcmQuoteFailure(quote.data.failure, route)}
						</div>
					)}
					{isSuccess && !isDryRunConclusive && (
						<p className="mb-2">
							The simulation runs the call without charging its fee, so it
							cannot tell whether the fee can be paid.
						</p>
					)}
					<p>
						The transaction is simulated on {origin}, then the message it sends
						is simulated on {hops.join(", then on ")}. The amount received can
						differ slightly once it arrives.
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
};

const FeeLabel: FC<{ label: string; explanation: string }> = ({
	label,
	explanation,
}) => (
	<Tooltip placement="bottom-start">
		<TooltipTrigger render={<div />}>
			<div className="flex items-center gap-1">
				{label}
				<InformationCircleIcon className="size-4 inline align-text-bottom" />
			</div>
		</TooltipTrigger>
		<TooltipContent>
			<p className="max-w-72">{explanation}</p>
		</TooltipContent>
	</Tooltip>
);

const feeShimmer = <Shimmer className="h-4">0.0000 AAA</Shimmer>;

export const XcmQuoteRows: FC<{ quote: XcmQuoteState; route: XcmRoute }> = ({
	quote,
	route,
}) => {
	const { tokenOut } = useSwap();
	const xcmQuote = quote.data?.success ? quote.data.quote : undefined;
	const [origin, ...hops] = getXcmChainNames(route);
	const isBridge = isBridgeLane(route);

	return (
		<>
			<FormSummaryRow
				label="You receive"
				value={
					quote.isLoading ? (
						<Shimmer className="h-4">0.0000 AAA</Shimmer>
					) : (
						xcmQuote &&
						tokenOut && (
							<span>
								~<Tokens plancks={xcmQuote.received} token={tokenOut} />
							</span>
						)
					)
				}
			/>
			<FormSummaryRow
				label={
					<FeeLabel
						label={isBridge ? "Bridge fee" : "Delivery fee"}
						explanation={`Paid on ${origin} on top of the amount, to send it ${isBridge ? "over the bridge " : ""}to ${hops[0]}.`}
					/>
				}
				value={
					quote.deliveryFee ? (
						<TokenAmountValue {...quote.deliveryFee} />
					) : (
						quote.isLoading && feeShimmer
					)
				}
			/>
			<FormSummaryRow
				label={
					<FeeLabel
						label="Destination fee"
						explanation={`Taken from the transferred amount on ${hops.join(" and ")} as it arrives.`}
					/>
				}
				value={
					quote.isLoading
						? feeShimmer
						: xcmQuote && <TokenAmountValue {...xcmQuote.destinationFee} />
				}
			/>
			{isBridge && (
				<FormSummaryRow label="Arrival time" value="A few minutes" />
			)}
		</>
	);
};
