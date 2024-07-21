import { Layout } from "src/components";
import { Portfolio } from "src/features/portfolio/Portfolio";

export const PortfolioPage = () => (
  <Layout>
    <div className="p-2">
      <Portfolio />
    </div>
  </Layout>
);
