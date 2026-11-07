import type { FC } from "react";
import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../../../components/FormSummary";
import { TransactionFeeSummaryValue } from "../../../transaction/TransactionFeeSummaryValue";
import { useSwap } from "../../SwapProvider";
import type { XcmTransferDetails } from "../xcm/useXcmRoute";
import { XcmQuoteRows, XcmSimulationValue } from "../xcm/XcmQuoteRows";

export const XcmTransferSummary: FC<{ details: XcmTransferDetails }> = ({
	details: { route, quote },
}) => {
	const { transaction } = useSwap();

	return (
		<FormSummary>
			<FormSummarySection>
				<XcmQuoteRows quote={quote} route={route} />
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
