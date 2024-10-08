import { Navigate, createHashRouter } from "react-router-dom";

import { CreateLiquidityPoolPage } from "./create-pool";
import { ErrorBoundaryPage } from "./error";
import { LiquidityPoolPage } from "./pool";
import { LiquidityPoolsPage } from "./pools";
import { PortfolioPage } from "./portfolio";
import { AppWithRelay } from "./providers/AppWithRelay";
import { SwapPage } from "./swap";
import { TeleportPage } from "./teleport";
import { TransferPage } from "./transfer";

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
				path: "teleport",
				element: <TeleportPage />,
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
				element: <Navigate to="swap" replace />,
			},
			{
				path: "*",
				element: <Navigate to="swap" replace />,
			},
		],
	},
	{ path: "/", element: <Navigate to="/polkadot/swap" replace /> },
]);
