import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Shimmer } from "../../../../components/Shimmer";
import { Tokens } from "../../../../components/Tokens";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../../../components/tooltip/Tooltip";
import { useNativeToken } from "../../../../hooks/useNativeToken";
import { getChainById } from "../../../../registry/chains/chains";
import { cn } from "../../../../utils/cn";
import { TransactionFeeSummaryValue } from "../../../transaction/TransactionFeeSummaryValue";
import { SummaryRow } from "../../SummaryRow";
import { useSwap, type XcmTransferDetails } from "../../SwapProvider";
import type { XcmQuoteState } from "../xcm/useXcmQuote";
import { describeXcmQuoteFailure } from "../xcm/xcmQuote";

const XcmTransferSimulationValue: FC<{
	quote: XcmQuoteState;
	destinationName: string;
}> = ({ quote, destinationName }) => {
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
							{describeXcmQuoteFailure(quote.data.failure)}
						</div>
					)}
					<p>
						The transfer is simulated on Asset Hub, then the message it sends is
						simulated on {destinationName}. The amount received can differ
						slightly once it arrives.
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
};

export const XcmTransferSummary: FC<{ details: XcmTransferDetails }> = ({
	details: { route, quote },
}) => {
	const { tokenOut, transaction } = useSwap();
	const nativeToken = useNativeToken({ chain: getChainById(route.origin) });
	const destinationName = getChainById(route.destination).name;
	const xcmQuote = quote.data?.success ? quote.data.quote : null;

	return (
		<div className="flex flex-col gap-2">
			<div>
				<SummaryRow
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
				<SummaryRow
					label="XCM fee"
					value={
						quote.deliveryFee !== undefined && (
							<div className="flex flex-wrap justify-end">
								<Tokens plancks={quote.deliveryFee} token={nativeToken} />
								{xcmQuote && tokenOut && (
									<>
										<span className="mx-1">+</span>
										<Tokens
											plancks={xcmQuote.destinationFee}
											token={tokenOut}
										/>
									</>
								)}
							</div>
						)
					}
				/>
			</div>
			{!!transaction.call && (
				<div>
					<SummaryRow
						label="Simulation"
						value={
							<XcmTransferSimulationValue
								quote={quote}
								destinationName={destinationName}
							/>
						}
					/>
					<SummaryRow
						label="Transaction fee"
						value={<TransactionFeeSummaryValue />}
					/>
				</div>
			)}
		</div>
	);
};
