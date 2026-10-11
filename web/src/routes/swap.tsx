import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { Swap } from "../features/swap/Swap";

export const SwapPage = () => (
	<Layout>
		<ErrorBoundary>
			<Swap />
		</ErrorBoundary>
	</Layout>
);
