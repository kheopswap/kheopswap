import { RemoveLiquidityForm } from "./RemoveLiquidityForm";
import { RemoveLiquidityProvider } from "./RemoveLiquidityProvider";
import { RemoveLiquidityTransactionProvider } from "./RemoveLiquidityTransactionProvider";

export const RemoveLiquidity = () => (
	<RemoveLiquidityProvider>
		<RemoveLiquidityTransactionProvider>
			<RemoveLiquidityForm />
		</RemoveLiquidityTransactionProvider>
	</RemoveLiquidityProvider>
);
