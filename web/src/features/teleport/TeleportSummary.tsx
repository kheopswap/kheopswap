import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "src/components";
import { TransactionFeeSummaryValue } from "src/features/transaction/TransactionFeeSummaryValue";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { isBigInt } from "src/util";

export const TeleportSummary = () => {
	const { feeEstimate: estimateFee, feeToken } = useTransaction();

	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Transaction fee"
					value={<TransactionFeeSummaryValue />}
				/>
				<FormSummaryRow
					label="Destination transaction fee"
					value={
						!!feeToken &&
						isBigInt(estimateFee) && (
							<span className="text-neutral">Coming soon</span>
						)
					}
				/>
			</FormSummarySection>
		</FormSummary>
	);
};
