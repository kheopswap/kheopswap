import { LiquidityPoolPageProvider } from "./LiquidityPoolPageProvider";
import { LiquidityPoolForm } from "./LiquidityPoolForm";

export const LiquidityPool = () => (
	<LiquidityPoolPageProvider>
		<LiquidityPoolForm />
	</LiquidityPoolPageProvider>
);
