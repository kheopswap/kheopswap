import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import "@fontsource-variable/lexend-deca";

import { KheopskitProvider } from "@kheopskit/react";
import { Subscribe } from "@react-rxjs/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { DEV } from "./common/constants";
import { kheopskitConfig } from "./common/kheopskit";
import { SuspenseMonitor } from "./components/SuspenseMonitor";
import { Toasts } from "./components/Toasts";
import { router } from "./routes";
import { GlobalFollowUpModal } from "./state/transactions/GlobalFollowUpModal";
import { TransactionsProvider } from "./state/transactions/TransactionsProvider";
import { TransactionToasts } from "./state/transactions/TransactionToasts";
import { preloadFont } from "./utils/preloadFont";

preloadFont();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<KheopskitProvider config={kheopskitConfig}>
			<QueryClientProvider client={queryClient}>
				<Subscribe fallback={<SuspenseMonitor label="Subscribe" />}>
					<TransactionsProvider>
						<RouterProvider router={router} unstable_useTransitions={false} />
						<GlobalFollowUpModal />
						<TransactionToasts />
					</TransactionsProvider>
				</Subscribe>
			</QueryClientProvider>
			<Toasts />
		</KheopskitProvider>
	</React.StrictMode>,
);

if (DEV) import("./common/devImports");
