import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { Portfolio } from "../features/portfolio/Portfolio";

export const PortfolioPage = () => (
	<Layout>
		<ErrorBoundary>
			<Portfolio />
		</ErrorBoundary>
	</Layout>
);
