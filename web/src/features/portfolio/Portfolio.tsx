import { PortfolioProvider } from "./PortfolioProvider";
import { PortfolioTable } from "./PortfolioTable";

import { useWallets } from "src/hooks";

export const Portfolio = () => {
  const { isReady } = useWallets();

  // prevent flickering on page load by waiting for wallet auto-connect to be performed
  if (!isReady) return null;

  return (
    <PortfolioProvider>
      <PortfolioTable />
    </PortfolioProvider>
  );
};
