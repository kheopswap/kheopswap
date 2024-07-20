import {
  FormSummary,
  FormSummaryRow,
  FormSummarySection,
} from "src/components";
import { TransactionFeeSummaryValue } from "src/features/transaction/TransactionFeeSummaryValue";

export const TransferSummary = () => {
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
