import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";
import { AddLiquidityForm } from "./AddLiquidityForm";
import { AddLiquidityProvider } from "./AddLiquidityProvider";
import { AddLiquidityTransactionProvider } from "./AddLiquidityTransactionProvider";

export const AddLiquidity = () => (
	<AddLiquidityProvider>
		<AddLiquidityTransactionProvider>
			<AddLiquidityForm />
			<TransactionFollowUp />
		</AddLiquidityTransactionProvider>
	</AddLiquidityProvider>
);
