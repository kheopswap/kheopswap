import { LiquidityPoolForm } from "./LiquidityPoolForm";
import { LiquidityPoolPageProvider } from "./LiquidityPoolPageProvider";

export const LiquidityPool = () => (
	<LiquidityPoolPageProvider>
		<LiquidityPoolForm />
	</LiquidityPoolPageProvider>
);
