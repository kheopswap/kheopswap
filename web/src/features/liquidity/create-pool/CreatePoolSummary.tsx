import {
	FormSummary,
	FormSummarySection,
} from "../../../components/FormSummary";
import { TransactionFeeSummaryRow } from "../../transaction/TransactionFeeSummaryRow";

export const CreatePoolSummary = () => {
	return (
		<FormSummary>
			<FormSummarySection>
				<TransactionFeeSummaryRow />
			</FormSummarySection>
		</FormSummary>
	);
};
