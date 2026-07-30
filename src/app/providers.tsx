"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { PostHogProvider } from "./posthog-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PostHogProvider>
  )
}

