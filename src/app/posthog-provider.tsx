"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && typeof window !== "undefined") {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture("$pageview", { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

    if (typeof window !== "undefined" && posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        capture_pageview: false, // Handled manually for Next.js App Router route changes
        capture_pageleave: true,
      })
    }
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
