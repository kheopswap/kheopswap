import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { Portfolio } from "../features/portfolio/Portfolio";

export const PortfolioPage = () => (
	<Layout>
		<div className="p-2">
			<ErrorBoundary>
				<Portfolio />
			</ErrorBoundary>
		</div>
	</Layout>
);
