import type { FC } from "react";
import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../../../components/FormSummary";
import { getChainById } from "../../../../registry/chains/chains";
import { TransactionFeeSummaryValue } from "../../../transaction/TransactionFeeSummaryValue";
import { useSwap } from "../../SwapProvider";
import type { XcmTransferDetails } from "../xcm/useXcmRoute";
import { XcmQuoteRows, XcmSimulationValue } from "../xcm/XcmQuoteRows";
import { isXcmLane } from "../xcmLanes";

export const XcmTransferSummary: FC<{ details: XcmTransferDetails }> = ({
	details: { route, quote },
}) => {
	const { transaction } = useSwap();

	return (
		<FormSummary>
			<FormSummarySection>
				<XcmQuoteRows quote={quote} route={route} />
				{!isXcmLane({
					origin: route.destination,
					destination: route.origin,
				}) && (
					<p className="py-1.25 text-warn">
						Kheopswap cannot bring these tokens back from{" "}
						{getChainById(route.destination).name} to{" "}
						{getChainById(route.origin).name}.
					</p>
				)}
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
				</FormSummarySection>
			)}
		</FormSummary>
	);
};
