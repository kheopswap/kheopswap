import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { type FC, Fragment } from "react";
import { FormSummaryRow } from "../../../../components/FormSummary";
import { Shimmer } from "../../../../components/Shimmer";
import { Tokens } from "../../../../components/Tokens";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../../../components/tooltip/Tooltip";
import { getChainById } from "../../../../registry/chains/chains";
import type { TokenAmount } from "../../../../registry/tokens/types";
import { cn } from "../../../../utils/cn";
import { isBigInt } from "../../../../utils/isBigInt";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { useSwap } from "../../SwapProvider";
import { TokenAmountValue } from "../AmmPathValues";
import type { XcmRoute } from "../swapRoute";
import type { XcmQuoteState } from "./useXcmQuote";
import {
	describeXcmQuoteFailure,
	getTotalDebited,
	type XcmFee,
	type XcmReceived,
} from "./xcmQuote";

export const XcmSimulationValue: FC<{
	quote: XcmQuoteState;
	route: XcmRoute;
}> = ({ quote, route }) => {
	if (quote.isLoading) return <Shimmer className="h-4">Success</Shimmer>;
	if (!quote.data) return null;

	return (
		<Tooltip placement="bottom-end">
			<TooltipTrigger render={<div />}>
				<div
					className={cn(
						"flex gap-1 items-center",
						!quote.data.success && "text-warn",
					)}
				>
					<span>{quote.data.success ? "Success" : "Failed"}</span>
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
					<p>
						The transaction is simulated on {getChainById(route.origin).name},
						then the message it sends is simulated on{" "}
						{getChainById(route.destination).name}. The amount received can
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

const TokenAmounts: FC<{ amounts: TokenAmount[] }> = ({ amounts }) => (
	<div className="flex flex-wrap justify-end">
		{amounts.map(({ tokenId, plancks }, index) => (
			<Fragment key={tokenId}>
				{index > 0 && <span className="mx-1">+</span>}
				<TokenAmountValue tokenId={tokenId} plancks={plancks} />
			</Fragment>
		))}
	</div>
);

const feeShimmer = <Shimmer className="h-4">0.0000 AAA</Shimmer>;

const TotalDebitedValue: FC<{ quote: XcmQuoteState }> = ({ quote }) => {
	const { totalIn, transaction, isLoadingCall } = useSwap();
	const { feeEstimate, feeToken, isCallFeeEstimated, errorFeeEstimate } =
		useTransaction();
	if (!totalIn) return null;
	const transactionFee =
		transaction.call && isCallFeeEstimated && feeToken && isBigInt(feeEstimate)
			? { tokenId: feeToken.id, plancks: feeEstimate }
			: undefined;
	const isEstimatingCallFee =
		!!transaction.call && !isCallFeeEstimated && !errorFeeEstimate;
	if (!quote.deliveryFee || quote.deliveryFee.isEstimate || !transactionFee)
		return quote.isLoading || isLoadingCall || isEstimatingCallFee
			? feeShimmer
			: null;

	const amounts = getTotalDebited(transaction.callSpendings, transactionFee);
	return amounts.length ? <TokenAmounts amounts={amounts} /> : null;
};

const FeeValue: FC<{ fee: XcmFee }> = ({ fee: { isEstimate, ...amount } }) => (
	<span className={cn(isEstimate && "text-muted")}>
		<TokenAmountValue {...amount} />
		{isEstimate && " (est.)"}
	</span>
);

const ReceivedValue: FC<{ received: XcmReceived; isLoading: boolean }> = ({
	received: { plancks, isEstimate },
	isLoading,
}) => {
	const { tokenOut } = useSwap();
	if (!tokenOut) return null;
	return (
		<span className={cn(isEstimate && "text-muted")}>
			~<Tokens plancks={plancks} token={tokenOut} pulse={isLoading} />
			{isEstimate && " (est.)"}
		</span>
	);
};

export const XcmQuoteRows: FC<{
	quote: XcmQuoteState;
	received: XcmReceived | undefined;
	destinationFee: XcmFee | undefined;
	route: XcmRoute;
}> = ({ quote, received, destinationFee, route }) => {
	const origin = getChainById(route.origin).name;
	const destination = getChainById(route.destination).name;
	const loadingShimmer = quote.isLoading && feeShimmer;

	return (
		<>
			<FormSummaryRow
				label="You receive"
				value={
					received ? (
						<ReceivedValue received={received} isLoading={quote.isLoading} />
					) : (
						loadingShimmer
					)
				}
			/>
			<FormSummaryRow
				label={
					<FeeLabel
						label="Delivery fee"
						explanation={`Paid on ${origin} on top of the amount, to deliver it to ${destination}.`}
					/>
				}
				value={
					quote.deliveryFee ? (
						<FeeValue fee={quote.deliveryFee} />
					) : (
						loadingShimmer
					)
				}
			/>
			<FormSummaryRow
				label={
					<FeeLabel
						label={`${destination} fee`}
						explanation={`Taken by ${destination} from the amount when it arrives.`}
					/>
				}
				value={
					loadingShimmer ||
					(destinationFee && <FeeValue fee={destinationFee} />)
				}
			/>
			<FormSummaryRow
				label="Total debited"
				value={<TotalDebitedValue quote={quote} />}
			/>
		</>
	);
};
