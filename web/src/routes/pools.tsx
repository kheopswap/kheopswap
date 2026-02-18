import { Layout } from "../components/layout/Layout";
import { TabTitle } from "../components/TabTitle";
import { LiquidityPools } from "../features/liquidity/pools/LiquidityPools";

export const LiquidityPoolsPage = () => (
	<Layout>
		<div className="p-2">
			<LiquidityPools />
		</div>
		<TabTitle title="Liquidity Pools" />
	</Layout>
);
