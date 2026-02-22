import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { TabTitle } from "../components/TabTitle";
import { LiquidityPools } from "../features/liquidity/pools/LiquidityPools";

export const LiquidityPoolsPage = () => (
	<Layout>
		<div className="p-2">
			<ErrorBoundary>
				<LiquidityPools />
			</ErrorBoundary>
		</div>
		<TabTitle title="Liquidity Pools" />
	</Layout>
);
