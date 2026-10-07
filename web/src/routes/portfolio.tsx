import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { Portfolio } from "../features/portfolio/Portfolio";

export const PortfolioPage = () => (
	<Layout>
		<PageContent variant="table">
			<ErrorBoundary>
				<Portfolio />
			</ErrorBoundary>
		</PageContent>
	</Layout>
);
