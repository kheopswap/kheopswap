import { RemoveLiquidityForm } from "./RemoveLiquidityForm";
import { RemoveLiquidityProvider } from "./RemoveLiquidityProvider";
import { RemoveLiquidityTransactionProvider } from "./RemoveLiquidityTransactionProvider";

import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";

export const RemoveLiquidity = () => (
  <RemoveLiquidityProvider>
    <RemoveLiquidityTransactionProvider>
      <RemoveLiquidityForm />
      <TransactionFollowUp />
    </RemoveLiquidityTransactionProvider>
  </RemoveLiquidityProvider>
);
