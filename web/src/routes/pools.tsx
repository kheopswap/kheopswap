import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { TabTitle } from "../components/TabTitle";
import { LiquidityPools } from "../features/liquidity/pools/LiquidityPools";

export const LiquidityPoolsPage = () => (
	<Layout>
		<ErrorBoundary>
			<LiquidityPools />
		</ErrorBoundary>
		<TabTitle title="Liquidity Pools" />
	</Layout>
);
