import type { FC } from "react";
import { TransactionFeeSummaryValue } from "../../../transaction/TransactionFeeSummaryValue";
import { SummaryRow } from "../../SummaryRow";
import { useSwap } from "../../SwapProvider";
import type { XcmTransferDetails } from "../xcm/useXcmRoute";
import { XcmQuoteRows, XcmSimulationValue } from "../xcm/XcmQuoteRows";

export const XcmTransferSummary: FC<{ details: XcmTransferDetails }> = ({
	details: { route, quote },
}) => {
	const { transaction } = useSwap();

	return (
		<div className="flex flex-col gap-2">
			<div>
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
				</div>
			)}
		</div>
	);
};
