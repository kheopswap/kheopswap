import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";
import { TransferForm } from "./TransferForm";
import { TransferProvider } from "./TransferProvider";
import { TransferTransactionProvider } from "./TransferTransactionProvider";

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
