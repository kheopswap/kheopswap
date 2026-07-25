import { createHashRouter, Navigate, useParams } from "react-router";

import { CreateLiquidityPoolPage } from "./create-pool";
import { ErrorBoundaryPage } from "./error";
import { LiquidityPoolPage } from "./pool";
import { LiquidityPoolsPage } from "./pools";
import { PortfolioPage } from "./portfolio";
import { AppWithRelay } from "./providers/AppWithRelay";
import { SwapPage } from "./swap";
import { TransferPage } from "./transfer";

// relative targets resolve against the matched path, which for the catch-all route
// includes the unmatched segments - it would redirect to `<unknown path>/swap`, match
// the catch-all again, and loop until the URL is unusable
const RedirectToSwap = () => {
	const { relayId } = useParams();
	return <Navigate to={`/${relayId}/swap`} replace />;
};

export const router = createHashRouter([
	{
		path: "/:relayId",
		element: <AppWithRelay />,
		errorElement: <ErrorBoundaryPage />,
		children: [
			{
				path: "swap",
				element: <SwapPage />,
			},
			{
				path: "portfolio",
				element: <PortfolioPage />,
			},
			{
				path: "transfer",
				element: <TransferPage />,
			},
			{
				path: "pools/create/:tokenId",
				element: <CreateLiquidityPoolPage />,
			},
			{
				path: "pools/:poolAssetId",
				element: <LiquidityPoolPage />,
			},
			{
				path: "pools",
				element: <LiquidityPoolsPage />,
			},
			{
				path: "",
				element: <RedirectToSwap />,
			},
			{
				path: "*",
				element: <RedirectToSwap />,
			},
		],
	},
	{ path: "/", element: <Navigate to="/polkadot/swap" replace /> },
]);
