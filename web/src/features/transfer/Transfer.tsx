import { TransferForm } from "./TransferForm";
import { TransferProvider } from "./TransferProvider";
import { TransferTransactionProvider } from "./TransferTransactionProvider";

import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";

export const Transfer = () => {
  return (
    <TransferProvider>
      <TransferTransactionProvider>
        <TransferForm />
        <TransactionFollowUp />
      </TransferTransactionProvider>
    </TransferProvider>
  );
};
