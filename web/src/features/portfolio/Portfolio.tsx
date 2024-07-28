import { PortfolioProvider } from "./PortfolioProvider";
import { PortfolioTable } from "./PortfolioTable";

export const Portfolio = () => (
  <PortfolioProvider>
    <PortfolioTable />
  </PortfolioProvider>
);
