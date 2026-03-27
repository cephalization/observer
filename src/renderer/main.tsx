import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <App />
          <Toaster position="top-right" richColors theme="dark" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
