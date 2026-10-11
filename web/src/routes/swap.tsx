import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { Swap } from "../features/swap/Swap";

export const SwapPage = () => (
	<Layout>
		<PageContent>
			<ErrorBoundary>
				<Swap />
			</ErrorBoundary>
		</PageContent>
	</Layout>
);
