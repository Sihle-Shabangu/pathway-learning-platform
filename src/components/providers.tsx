"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api-client";

/**
 * Retry network failures and server errors (they are often temporary) up to twice.
 * Never retry 4xx responses: asking again won't change "not found" or "forbidden".
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500;
  return true;
}

/** Client-side providers shared by every page: TanStack Query and toasts. */
export function Providers({ children }: { children: ReactNode }) {
  // useState so each browser tab gets one QueryClient that survives re-renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, retry: shouldRetry, refetchOnWindowFocus: true },
          // Mutations are never retried automatically: the user decides (and the server rejects duplicates).
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
