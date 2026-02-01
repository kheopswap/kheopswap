import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import "@fontsource-variable/lexend-deca";

import { KheopskitProvider } from "@kheopskit/react";
import { Subscribe } from "@react-rxjs/core";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { preloadFont } from "../../packages/utils/src/preloadFont";
import { SuspenseMonitor } from "./components/SuspenseMonitor";
import { Toasts } from "./components/Toasts";
import { kheopskitConfig } from "./kheopskit";
import { router } from "./routes";
import {
	GlobalFollowUpModal,
	TransactionsProvider,
	TransactionToasts,
} from "./state/transactions";

preloadFont();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<KheopskitProvider config={kheopskitConfig}>
			<QueryClientProvider client={queryClient}>
				<Subscribe fallback={<SuspenseMonitor label="Subscribe" />}>
					<TransactionsProvider>
						<RouterProvider router={router} />
						<GlobalFollowUpModal />
						<TransactionToasts />
					</TransactionsProvider>
				</Subscribe>
			</QueryClientProvider>
			<Toasts />
		</KheopskitProvider>
	</React.StrictMode>,
);

if (import.meta.env.DEV) import("./devImports");
