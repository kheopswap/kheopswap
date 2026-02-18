import type { FC } from "react";

import {
	FormSummary,
	FormSummaryRow,
} from "../../../../components/FormSummary";
import { TransactionDryRunSummaryValue } from "../../../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../../../transaction/TransactionFeeSummaryValue";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { LiquidityPoolSlippage } from "../LiquidityPoolSlippage";

export const AddLiquiditySummary: FC = () => {
	const { lpSlippage } = useLiquidityPoolPage();

	return (
		<FormSummary>
			<FormSummaryRow
				label="Slippage tolerance"
				value={<LiquidityPoolSlippage value={lpSlippage} />}
			/>
			<FormSummaryRow
				label="Simulation"
				value={<TransactionDryRunSummaryValue />}
			/>
			<FormSummaryRow
				label="Transaction fee"
				value={<TransactionFeeSummaryValue />}
			/>
		</FormSummary>
	);
};
