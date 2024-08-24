import "react-toastify/dist/ReactToastify.min.css";
import "./index.css";

import "@fontsource-variable/lexend-deca";

import React from "react";
import ReactDOM from "react-dom/client";

import { Subscribe } from "@react-rxjs/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { SuspenseMonitor } from "./components/SuspenseMonitor";
import { Toasts } from "./components/Toasts";
import { router } from "./routes";
import { preloadFont } from "./util/preloadFont";

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

// if (import.meta.env.DEV) import("./devImports");
