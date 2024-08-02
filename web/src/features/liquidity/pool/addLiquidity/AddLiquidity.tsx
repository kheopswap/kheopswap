import { AddLiquidityForm } from "./AddLiquidityForm";
import { AddLiquidityProvider } from "./AddLiquidityProvider";
import { AddLiquidityTransactionProvider } from "./AddLiquidityTransactionProvider";

import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";

export const AddLiquidity = () => (
	<AddLiquidityProvider>
		<AddLiquidityTransactionProvider>
			<AddLiquidityForm />
			<TransactionFollowUp />
		</AddLiquidityTransactionProvider>
	</AddLiquidityProvider>
);
