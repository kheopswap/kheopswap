import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { TabTitle } from "../components/TabTitle";
import { LiquidityPools } from "../features/liquidity/pools/LiquidityPools";

export const LiquidityPoolsPage = () => (
	<Layout>
		<PageContent variant="table">
			<ErrorBoundary>
				<LiquidityPools />
			</ErrorBoundary>
		</PageContent>
		<TabTitle title="Liquidity Pools" />
	</Layout>
);
