import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../../components/FormSummary";
import { TransactionFeeSummaryValue } from "../../transaction/TransactionFeeSummaryValue";

export const CreatePoolSummary = () => {
	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Transaction fee"
					value={<TransactionFeeSummaryValue />}
				/>
			</FormSummarySection>
		</FormSummary>
	);
};
