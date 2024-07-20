import { FC } from "react";

import { FormSummary, FormSummaryRow } from "src/components";
import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import { LiquidityPoolSlippage } from "src/features/liquidity/pool/LiquidityPoolSlippage";
import { TransactionFeeSummaryValue } from "src/features/transaction/TransactionFeeSummaryValue";

export const AddLiquiditySummary: FC = () => {
  const { lpSlippage } = useLiquidityPoolPage();

  return (
    <FormSummary>
      <FormSummaryRow
        label="Slippage tolerance"
        value={<LiquidityPoolSlippage value={lpSlippage} />}
      />
      <FormSummaryRow
        label="Transaction fee"
        value={<TransactionFeeSummaryValue />}
      />
    </FormSummary>
  );
};
