import { Navigate, createHashRouter } from "react-router-dom";

import { CreateLiquidityPoolPage } from "./create-pool";
import { ErrorBoundaryPage } from "./error";
import { OperationPage } from "./operation";
import { LiquidityPoolPage } from "./pool";
import { LiquidityPoolsPage } from "./pools";
import { PortfolioPage } from "./portfolio";
import { AppWithRelay } from "./providers/AppWithRelay";

export const router = createHashRouter([
	{
		path: "/:relayId",
		element: <AppWithRelay />,
		errorElement: <ErrorBoundaryPage />,
		children: [
			{
				path: "operation",
				element: <OperationPage />,
			},
			{
				path: "portfolio",
				element: <PortfolioPage />,
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
				element: <Navigate to="operation" replace />,
			},
			{
				path: "*",
				element: <Navigate to="operation" replace />,
			},
		],
	},
	{ path: "/", element: <Navigate to="/polkadot/operation" replace /> },
]);
