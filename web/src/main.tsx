import "react-toastify/dist/ReactToastify.min.css";
import "./index.css";

import "@fontsource-variable/lexend-deca";

import "./services/settings"; // must be imported early

import React from "react";
// eslint-disable-next-line import/order
import ReactDOM from "react-dom/client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Subscribe } from "@react-rxjs/core";

import { router } from "./routes";
import { preloadFont } from "./util/preloadFont";
import { SuspenseMonitor } from "./components/SuspenseMonitor";

preloadFont();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Subscribe fallback={<SuspenseMonitor label="Subscribe" />}>
        <RouterProvider router={router} />
      </Subscribe>
    </QueryClientProvider>
    <ToastContainer
      theme="dark"
      bodyClassName="font-sans text-sm"
      position="bottom-right"
    />
  </React.StrictMode>,
);

// if (import.meta.env.DEV) import("./devImports");
