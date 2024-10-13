import "react-toastify/dist/ReactToastify.min.css";
import "./index.css";

import "@fontsource-variable/lexend-deca";

import React from "react";
import ReactDOM from "react-dom/client";

import { Subscribe } from "@react-rxjs/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { DEV } from "@kheopswap/constants";
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
				<RouterProvider
					router={router}
					fallbackElement={<SuspenseMonitor label="RouterProvider" />}
				/>
			</Subscribe>
		</QueryClientProvider>
		<Toasts />
	</React.StrictMode>,
);

if (DEV) import("./devImports");
