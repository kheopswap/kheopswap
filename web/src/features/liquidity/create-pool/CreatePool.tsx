import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";
import { CreatePoolForm } from "./CreatePoolForm";
import { CreatePoolProvider } from "./CreatePoolProvider";
import { CreatePoolTransactionProvider } from "./CreatePoolTransactionProvider";

export const CreatePool = () => (
	<CreatePoolProvider>
		<CreatePoolTransactionProvider>
			<CreatePoolForm />
			<TransactionFollowUp />
		</CreatePoolTransactionProvider>
	</CreatePoolProvider>
);
