import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "src/components";
import { TransactionFeeSummaryValue } from "src/features/transaction/TransactionFeeSummaryValue";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";

export const TransferSummary = () => {
	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Simulation"
					value={<TransactionDryRunSummaryValue />}
				/>
				<FormSummaryRow
					label="Transaction fee"
					value={<TransactionFeeSummaryValue />}
				/>
			</FormSummarySection>
		</FormSummary>
	);
};
