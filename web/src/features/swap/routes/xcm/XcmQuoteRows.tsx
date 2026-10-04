import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { compact, keyBy } from "lodash-es";
import { type FC, Fragment } from "react";
import { Shimmer } from "../../../../components/Shimmer";
import { Tokens } from "../../../../components/Tokens";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../../../components/tooltip/Tooltip";
import { useToken } from "../../../../hooks/useToken";
import { getChainById } from "../../../../registry/chains/chains";
import { cn } from "../../../../utils/cn";
import { SummaryRow } from "../../SummaryRow";
import { useSwap } from "../../SwapProvider";
import type { XcmRoute } from "../swapRoute";
import type { XcmQuoteState } from "./useXcmQuote";
import { describeXcmQuoteFailure, getXcmFeeParts } from "./xcmQuote";

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

export const XcmQuoteRows: FC<{ quote: XcmQuoteState; route: XcmRoute }> = ({
	quote,
	route,
}) => {
	const { tokenOut } = useSwap();
	const { data: deliveryFeeToken } = useToken({
		tokenId: quote.deliveryFee?.tokenId,
	});
	const xcmQuote = quote.data?.success ? quote.data.quote : undefined;
	const feeTokens = keyBy(compact([deliveryFeeToken, tokenOut]), "id");
	const fees = getXcmFeeParts(
		quote.deliveryFee,
		xcmQuote,
		route.tokenIdOut,
	).flatMap(({ tokenId, plancks }) => {
		const token = feeTokens[tokenId];
		return token ? [{ token, plancks }] : [];
	});

	return (
		<>
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
					!!fees.length && (
						<div className="flex flex-wrap justify-end">
							{fees.map(({ token, plancks }, index) => (
								<Fragment key={token.id}>
									{index > 0 && <span className="mx-1">+</span>}
									<Tokens plancks={plancks} token={token} />
								</Fragment>
							))}
						</div>
					)
				}
			/>
		</>
	);
};
