import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { OpenF1Error } from "./api/openf1/client";
import { SeasonProvider } from "./app/season";
import { router } from "./app/router";
import "@fontsource-variable/inter/wght.css";
import "./styles/global.css";
import "./styles/motion.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Freshness is handled by the persistent OpenF1 cache (client.ts); in-memory data stays valid.
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      // The client already retries 429/5xx; retrying 4xx would only burn rate limit.
      retry: (failureCount, error) =>
        !(error instanceof OpenF1Error) && failureCount < 1,
    },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root missing");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SeasonProvider>
        <RouterProvider router={router} />
      </SeasonProvider>
    </QueryClientProvider>
  </StrictMode>,
);
