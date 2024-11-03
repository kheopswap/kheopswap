import { useMemo } from "react";
import { TabTitle } from "src/components";
import { PortfolioProvider, usePortfolio } from "./PortfolioProvider";
import { PortfolioTable } from "./PortfolioTable";

export const Portfolio = () => (
	<PortfolioProvider>
		<PortfolioTable />
		<PortfolioTabTitle />
	</PortfolioProvider>
);

const PortfolioTabTitle = () => {
	const { accounts } = usePortfolio();

	const title = useMemo(
		() => (accounts?.length ? "Portfolio" : "Tokens"),
		// accounts can be undefined in dev mode when the app is hot reloaded
		[accounts?.length],
	);

	return <TabTitle title={title} />;
};
