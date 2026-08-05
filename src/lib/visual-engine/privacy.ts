import { db } from "@/lib/db"

export const MIRAVA_TERMS_VERSION = "2026-08-05"
export const MIRAVA_PRIVACY_VERSION = "2026-08-05"
export const MIRAVA_IDENTITY_CONSENT_VERSION = "2026-08-05"
export const MIRAVA_ANALYTICS_CONSENT_VERSION = "2026-08-05"

export type MiravaPrivacyStatus = {
  termsAccepted: boolean
  identityProcessingAccepted: boolean
  analyticsAccepted: boolean | null
  requiredAccepted: boolean
  termsVersion: string
  privacyVersion: string
  identityConsentVersion: string
  analyticsConsentVersion: string
  identityWithdrawnAt: string | null
}

type ConsentEvent = {
  purpose: string
  decision: string
  documentVersion: string
  createdAt: string
}

function latestFor(events: ConsentEvent[], purpose: string): ConsentEvent | null {
  return events.find((event) => event.purpose === purpose) ?? null
}

export async function getMiravaPrivacyStatus(userId: string): Promise<MiravaPrivacyStatus> {
  const events = await db.studioConsentEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  }) as ConsentEvent[]

  const terms = latestFor(events, "terms")
  const identity = latestFor(events, "identity_processing")
  const analytics = latestFor(events, "analytics")

  const termsAccepted =
    terms?.decision === "accepted" &&
    terms.documentVersion === MIRAVA_TERMS_VERSION

  const identityProcessingAccepted =
    identity?.decision === "accepted" &&
    identity.documentVersion === MIRAVA_IDENTITY_CONSENT_VERSION

  const analyticsAccepted = analytics
    ? analytics.decision === "accepted"
    : null

  return {
    termsAccepted,
    identityProcessingAccepted,
    analyticsAccepted,
    requiredAccepted: termsAccepted && identityProcessingAccepted,
    termsVersion: MIRAVA_TERMS_VERSION,
    privacyVersion: MIRAVA_PRIVACY_VERSION,
    identityConsentVersion: MIRAVA_IDENTITY_CONSENT_VERSION,
    analyticsConsentVersion: MIRAVA_ANALYTICS_CONSENT_VERSION,
    identityWithdrawnAt:
      identity?.decision === "withdrawn"
        ? identity.createdAt
        : null,
  }
}

async function recordEvent(args: {
  userId: string
  purpose: "terms" | "identity_processing" | "analytics"
  decision: "accepted" | "refused" | "withdrawn"
  documentVersion: string
  locale: "fr" | "es"
  source: string
}) {
  return db.studioConsentEvent.create({
    data: {
      userId: args.userId,
      purpose: args.purpose,
      decision: args.decision,
      documentVersion: args.documentVersion,
      locale: args.locale,
      metadata: { source: args.source },
    },
  })
}

export async function acceptMiravaRequiredConsents(args: {
  userId: string
  locale: "fr" | "es"
  source: string
}): Promise<MiravaPrivacyStatus> {
  const current = await getMiravaPrivacyStatus(args.userId)

  if (!current.termsAccepted) {
    await recordEvent({
      ...args,
      purpose: "terms",
      decision: "accepted",
      documentVersion: MIRAVA_TERMS_VERSION,
    })
  }

  if (!current.identityProcessingAccepted) {
    await recordEvent({
      ...args,
      purpose: "identity_processing",
      decision: "accepted",
      documentVersion: MIRAVA_IDENTITY_CONSENT_VERSION,
    })
  }

  return getMiravaPrivacyStatus(args.userId)
}

export async function setMiravaAnalyticsDecision(args: {
  userId: string
  locale: "fr" | "es"
  accepted: boolean
  source: string
}): Promise<MiravaPrivacyStatus> {
  await recordEvent({
    userId: args.userId,
    locale: args.locale,
    source: args.source,
    purpose: "analytics",
    decision: args.accepted ? "accepted" : "refused",
    documentVersion: MIRAVA_ANALYTICS_CONSENT_VERSION,
  })

  return getMiravaPrivacyStatus(args.userId)
}

export async function withdrawMiravaIdentityConsent(args: {
  userId: string
  locale?: "fr" | "es"
  source: string
}): Promise<MiravaPrivacyStatus> {
  await recordEvent({
    userId: args.userId,
    locale: args.locale ?? "fr",
    source: args.source,
    purpose: "identity_processing",
    decision: "withdrawn",
    documentVersion: MIRAVA_IDENTITY_CONSENT_VERSION,
  })

  return getMiravaPrivacyStatus(args.userId)
}

export async function requireMiravaRequiredConsents(userId: string) {
  const status = await getMiravaPrivacyStatus(userId)
  if (!status.requiredAccepted) {
    throw new Error("MIRAVA_REQUIRED_CONSENT_MISSING")
  }
  return status
}

export async function requireMiravaIdentityConsent(userId: string) {
  const status = await getMiravaPrivacyStatus(userId)
  if (!status.identityProcessingAccepted) {
    throw new Error("MIRAVA_IDENTITY_CONSENT_MISSING")
  }
  return status
}
