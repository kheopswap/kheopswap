import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../components/FormSummary";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryRow } from "../transaction/TransactionFeeSummaryRow";

export const TransferSummary = () => {
	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Simulation"
					value={<TransactionDryRunSummaryValue />}
				/>
				<TransactionFeeSummaryRow />
			</FormSummarySection>
		</FormSummary>
	);
};
