"use client"

import posthog from "posthog-js"

export type MiravaAnalyticsConsent = "accepted" | "refused" | null

export const MIRAVA_ANALYTICS_STORAGE_KEY = "mirava:analytics-consent:v1"
export const MIRAVA_ANALYTICS_EVENT = "mirava:analytics-consent-changed"

export function readMiravaAnalyticsConsent(): MiravaAnalyticsConsent {
  if (typeof window === "undefined") return null

  try {
    const value = window.localStorage.getItem(
      MIRAVA_ANALYTICS_STORAGE_KEY,
    )

    return value === "accepted" ||
      value === "refused"
      ? value
      : null
  } catch {
    return null
  }
}

export function cacheMiravaAnalyticsConsent(
  consent: Exclude<MiravaAnalyticsConsent, null>,
) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      MIRAVA_ANALYTICS_STORAGE_KEY,
      consent,
    )
  } catch {
    /*
     * Certains contextes privés peuvent refuser le stockage.
     * L'événement conserve néanmoins le choix pour la session courante.
     */
  }

  window.dispatchEvent(
    new CustomEvent(
      MIRAVA_ANALYTICS_EVENT,
      {
        detail: consent,
      },
    ),
  )
}

export function setMiravaAnalyticsConsent(
  consent: Exclude<MiravaAnalyticsConsent, null>,
  locale: "fr" | "es" = "fr",
) {
  if (typeof window === "undefined") return

  cacheMiravaAnalyticsConsent(consent)

  void fetch("/api/visual-engine/privacy", {
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "set_analytics",
      accepted: consent === "accepted",
      locale,
    }),
  }).catch(() => undefined)
}

export function captureMiravaAnalytics(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (
    readMiravaAnalyticsConsent() !== "accepted" ||
    !posthog.__loaded ||
    posthog.has_opted_out_capturing()
  ) {
    return
  }

  posthog.capture(event, properties)
}
