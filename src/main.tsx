import React from "react";
import ReactDOM from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "next-themes";
import { initGlobalWebResilience } from "@/lib/global-resilience";
import { applyClientIdentityToDocument } from "@/config/client-identity";
import { RootErrorBoundary } from "@/components/root-error-boundary";
import App from "./App";
import "./index.css";

// Apply client identity (document title, theme-color meta, favicon)
applyClientIdentityToDocument();

// Initialize global web-level resilience against accidental reloads, form drops, and tab freezing
initGlobalWebResilience();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <App />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);
