import { Layout } from "../components/layout/Layout";
import { Portfolio } from "../features/portfolio/Portfolio";

export const PortfolioPage = () => (
	<Layout>
		<div className="p-2">
			<Portfolio />
		</div>
	</Layout>
);
