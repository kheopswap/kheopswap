import { Layout } from "src/components";
import { LiquidityPools } from "src/features/liquidity";

export const LiquidityPoolsPage = () => (
	<Layout>
		<div className="p-2">
			<LiquidityPools />
		</div>
	</Layout>
);
