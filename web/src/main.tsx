import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import "@fontsource-variable/lexend-deca";

import { DEV } from "@kheopswap/constants";
import { Subscribe } from "@react-rxjs/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { preloadFont } from "../../packages/utils/src/preloadFont";
import { SuspenseMonitor } from "./components/SuspenseMonitor";
import { Toasts } from "./components/Toasts";
import { router } from "./routes";

preloadFont();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<Subscribe fallback={<SuspenseMonitor label="Subscribe" />}>
				<RouterProvider router={router} />
			</Subscribe>
		</QueryClientProvider>
		<Toasts />
	</React.StrictMode>,
);

if (DEV) import("./devImports");
