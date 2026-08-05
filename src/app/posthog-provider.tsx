"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { usePathname } from "next/navigation"
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react"
import {
  MIRAVA_ANALYTICS_EVENT,
  readMiravaAnalyticsConsent,
  setMiravaAnalyticsConsent,
  type MiravaAnalyticsConsent,
} from "@/lib/mirava/analytics-consent.client"

function PostHogPageView({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()

  useEffect(() => {
    if (
      enabled &&
      pathname &&
      typeof window !== "undefined" &&
      posthog.__loaded
    ) {
      posthog.capture("$pageview", {
        $current_url: window.origin + pathname,
      })
    }
  }, [enabled, pathname])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<MiravaAnalyticsConsent>(null)

  const applyConsent = useCallback((next: MiravaAnalyticsConsent) => {
    setConsent(next)

    if (next !== "accepted") {
      if (posthog.__loaded) {
        posthog.opt_out_capturing()
        posthog.reset()
      }
      return
    }

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

    if (!posthogKey) return

    if (!posthog.__loaded) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "never",
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        disable_session_recording: true,
        respect_dnt: true,
      })
    } else {
      posthog.opt_in_capturing()
    }
  }, [])

  useEffect(() => {
    applyConsent(readMiravaAnalyticsConsent())

    const onConsentChanged = (event: Event) => {
      const next = (event as CustomEvent<MiravaAnalyticsConsent>).detail
      applyConsent(next)
    }

    window.addEventListener(MIRAVA_ANALYTICS_EVENT, onConsentChanged)
    return () => window.removeEventListener(MIRAVA_ANALYTICS_EVENT, onConsentChanged)
  }, [applyConsent])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView enabled={consent === "accepted"} />
      </Suspense>

      {children}

      {consent === null ? (
        <aside
          role="dialog"
          aria-label="Préférences de mesure d’audience"
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-white/15 bg-[#101111]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:bottom-5 sm:p-5"
        >
          <p className="font-jakarta text-sm font-semibold">
            Mesure d’audience facultative
          </p>
          <p className="mt-2 text-xs leading-5 text-white/65">
            MIRAVA utilise PostHog uniquement avec votre accord pour comprendre les parcours. Aucun enregistrement de session, aucune photo et aucun champ libre ne sont collectés par ce réglage.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMiravaAnalyticsConsent("refused")}
              className="min-h-11 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white"
            >
              Refuser
            </button>
            <button
              type="button"
              onClick={() => setMiravaAnalyticsConsent("accepted")}
              className="min-h-11 rounded-xl border border-[#ede8df] bg-[#ede8df] px-4 text-xs font-semibold text-black"
            >
              Accepter
            </button>
          </div>
        </aside>
      ) : null}
    </PHProvider>
  )
}
