import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../components/FormSummary";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { useTransfer } from "./TransferProvider";

export const TransferSummary = () => {
	const { outputErrorMessage } = useTransfer();
	return (
		<FormSummary>
			<FormSummarySection>
				<FormSummaryRow
					label="Simulation"
					value={
						<TransactionDryRunSummaryValue isBlocked={!!outputErrorMessage} />
					}
				/>
				<FormSummaryRow
					label="Transaction fee"
					value={<TransactionFeeSummaryValue />}
				/>
			</FormSummarySection>
		</FormSummary>
	);
};
