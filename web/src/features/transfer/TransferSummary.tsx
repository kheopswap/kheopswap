import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../components/FormSummary";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";

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
