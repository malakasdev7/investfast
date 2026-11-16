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
                "!rounded-2xl !border !border-border !bg-card !text-foreground !shadow-lg !font-sans",
              title: "!text-sm !font-semibold",
              description: "!text-xs !text-muted-foreground",
              closeButton: "!border-border !bg-card !text-muted-foreground hover:!text-foreground",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
