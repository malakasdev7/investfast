"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
        mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "glass-overlay !rounded-2xl !border !border-glass-border !text-foreground !shadow-xl !font-sans",
              title: "!text-sm !font-semibold",
              description: "!text-xs !text-muted-foreground",
              closeButton: "!border-glass-border !bg-glass-light-bg !text-muted-foreground hover:!text-foreground",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
