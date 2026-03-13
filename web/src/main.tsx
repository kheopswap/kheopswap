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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SuspenseMonitor } from "./components/SuspenseMonitor";
import { Toasts } from "./components/Toasts";
import { router } from "./routes";
import { GlobalFollowUpModal } from "./state/transactions/GlobalFollowUpModal";
import { TransactionsProvider } from "./state/transactions/TransactionsProvider";
import { TransactionToasts } from "./state/transactions/TransactionToasts";
import { preloadFont } from "./utils/preloadFont";

const AppErrorFallback = ({
	error,
	onReset,
}: {
	error: Error;
	onReset: () => void;
}) => (
	<div className="flex min-h-dvh flex-col items-center justify-center bg-primary-950 text-center">
		<h1 className="text-4xl font-bold text-neutral-300 sm:text-5xl">Ouch!</h1>
		<p className="mt-4 text-xl text-neutral-500">Something went wrong</p>
		<p className="mt-4 max-w-md truncate text-sm text-error">{error.message}</p>
		<button
			type="button"
			onClick={onReset}
			className="mt-8 rounded-sm bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-400"
		>
			Try Again
		</button>
	</div>
);

preloadFont();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ErrorBoundary
			fallback={(error, reset) => (
				<AppErrorFallback error={error} onReset={reset} />
			)}
		>
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
		</ErrorBoundary>
	</React.StrictMode>,
);

if (DEV) import("./common/devImports");
