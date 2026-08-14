import { db } from "@/lib/db"

export const MIRAVA_TERMS_VERSION = "2026-08-05"
export const MIRAVA_PRIVACY_VERSION = "2026-08-05"
export const MIRAVA_IDENTITY_CONSENT_VERSION = "2026-08-05"
export const MIRAVA_ANALYTICS_CONSENT_VERSION = "2026-08-05"
export const MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION =
  "2026-08-07"

export const MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION =
  "2026-08-09"

export type MiravaPrivacyStatus = {
  termsAccepted: boolean
  identityProcessingAccepted: boolean
  analyticsAccepted: boolean | null
  openaiIdentityAnalysisAccepted: boolean
  externalImageGenerationAccepted: boolean
  requiredAccepted: boolean
  termsVersion: string
  privacyVersion: string
  identityConsentVersion: string
  analyticsConsentVersion: string
  openaiIdentityAnalysisConsentVersion: string
  externalImageGenerationConsentVersion: string
  identityWithdrawnAt: string | null
  openaiIdentityAnalysisWithdrawnAt:
    string | null
  externalImageGenerationWithdrawnAt:
    string | null
}

type ConsentEvent = {
  purpose: string
  decision: string
  documentVersion: string
  createdAt: string
}

function latestFor(
  events: ConsentEvent[],
  purpose: string,
): ConsentEvent | null {
  return (
    events.find(
      (event) =>
        event.purpose === purpose,
    ) ?? null
  )
}

export async function getMiravaPrivacyStatus(
  userId: string,
): Promise<MiravaPrivacyStatus> {
  const events =
    await db.studioConsentEvent.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }) as ConsentEvent[]

  const terms =
    latestFor(
      events,
      "terms",
    )

  const identity =
    latestFor(
      events,
      "identity_processing",
    )

  const analytics =
    latestFor(
      events,
      "analytics",
    )

  const openaiIdentityAnalysis =
    latestFor(
      events,
      "openai_identity_analysis",
    )

  const externalImageGeneration =
    latestFor(
      events,
      "external_image_generation",
    )

  const termsAccepted =
    terms?.decision === "accepted" &&
    terms.documentVersion ===
      MIRAVA_TERMS_VERSION

  const identityProcessingAccepted =
    identity?.decision === "accepted" &&
    identity.documentVersion ===
      MIRAVA_IDENTITY_CONSENT_VERSION

  const analyticsAccepted =
    analytics
      ? analytics.decision ===
          "accepted"
      : null

  /*
   * OpenAI identity analysis is intentionally
   * independent from general identity processing.
   *
   * General identity consent remains required as
   * the underlying legal basis, therefore a prior
   * OpenAI acceptance cannot stay effective after
   * general identity consent is withdrawn.
   */
  const openaiIdentityAnalysisAccepted =
    identityProcessingAccepted &&
    openaiIdentityAnalysis
      ?.decision === "accepted" &&
    openaiIdentityAnalysis
      .documentVersion ===
      MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION

  /*
   * External image generation is separate from
   * general identity processing and from OpenAI
   * identity analysis.
   *
   * It becomes ineffective immediately when the
   * underlying identity-processing consent is no
   * longer active.
   */
  const externalImageGenerationAccepted =
    identityProcessingAccepted &&
    externalImageGeneration
      ?.decision === "accepted" &&
    externalImageGeneration
      .documentVersion ===
      MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION

  return {
    termsAccepted,
    identityProcessingAccepted,
    analyticsAccepted,
    openaiIdentityAnalysisAccepted,
    externalImageGenerationAccepted,
    requiredAccepted:
      termsAccepted &&
      identityProcessingAccepted,
    termsVersion:
      MIRAVA_TERMS_VERSION,
    privacyVersion:
      MIRAVA_PRIVACY_VERSION,
    identityConsentVersion:
      MIRAVA_IDENTITY_CONSENT_VERSION,
    analyticsConsentVersion:
      MIRAVA_ANALYTICS_CONSENT_VERSION,
    openaiIdentityAnalysisConsentVersion:
      MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION,
    externalImageGenerationConsentVersion:
      MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION,
    identityWithdrawnAt:
      identity?.decision ===
        "withdrawn"
        ? identity.createdAt
        : null,
    openaiIdentityAnalysisWithdrawnAt:
      openaiIdentityAnalysis
        ?.decision === "withdrawn"
        ? openaiIdentityAnalysis
            .createdAt
        : null,
    externalImageGenerationWithdrawnAt:
      externalImageGeneration
        ?.decision === "withdrawn"
        ? externalImageGeneration
            .createdAt
        : null,
  }
}

async function recordEvent(args: {
  userId: string
  purpose:
    | "terms"
    | "identity_processing"
    | "analytics"
    | "openai_identity_analysis"
    | "external_image_generation"
  decision:
    | "accepted"
    | "refused"
    | "withdrawn"
  documentVersion: string
  locale: "fr" | "es"
  source: string
}) {
  return db.studioConsentEvent.create({
    data: {
      userId:
        args.userId,
      purpose:
        args.purpose,
      decision:
        args.decision,
      documentVersion:
        args.documentVersion,
      locale:
        args.locale,
      metadata: {
        source:
          args.source,
      },
    },
  })
}

export async function acceptMiravaRequiredConsents(
  args: {
    userId: string
    locale: "fr" | "es"
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  const current =
    await getMiravaPrivacyStatus(
      args.userId,
    )

  if (!current.termsAccepted) {
    await recordEvent({
      ...args,
      purpose:
        "terms",
      decision:
        "accepted",
      documentVersion:
        MIRAVA_TERMS_VERSION,
    })
  }

  if (
    !current
      .identityProcessingAccepted
  ) {
    await recordEvent({
      ...args,
      purpose:
        "identity_processing",
      decision:
        "accepted",
      documentVersion:
        MIRAVA_IDENTITY_CONSENT_VERSION,
    })
  }

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function acceptMiravaOpenAiIdentityAnalysisConsent(
  args: {
    userId: string
    locale: "fr" | "es"
    disclosureAccepted: true
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  if (
    args.disclosureAccepted !== true
  ) {
    throw new Error(
      "MIRAVA_OPENAI_IDENTITY_ANALYSIS_DISCLOSURE_REQUIRED",
    )
  }

  const current =
    await getMiravaPrivacyStatus(
      args.userId,
    )

  if (
    !current
      .identityProcessingAccepted
  ) {
    throw new Error(
      "MIRAVA_IDENTITY_CONSENT_MISSING",
    )
  }

  if (
    !current
      .openaiIdentityAnalysisAccepted
  ) {
    await recordEvent({
      userId:
        args.userId,
      locale:
        args.locale,
      source:
        args.source,
      purpose:
        "openai_identity_analysis",
      decision:
        "accepted",
      documentVersion:
        MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION,
    })
  }

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function acceptMiravaExternalImageGenerationConsent(
  args: {
    userId: string
    locale: "fr" | "es"
    disclosureAccepted: true
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  if (
    args.disclosureAccepted !== true
  ) {
    throw new Error(
      "MIRAVA_EXTERNAL_IMAGE_GENERATION_DISCLOSURE_REQUIRED",
    )
  }

  const current =
    await getMiravaPrivacyStatus(
      args.userId,
    )

  if (
    !current
      .identityProcessingAccepted
  ) {
    throw new Error(
      "MIRAVA_IDENTITY_CONSENT_MISSING",
    )
  }

  if (
    !current
      .externalImageGenerationAccepted
  ) {
    await recordEvent({
      userId:
        args.userId,
      locale:
        args.locale,
      source:
        args.source,
      purpose:
        "external_image_generation",
      decision:
        "accepted",
      documentVersion:
        MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION,
    })
  }

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function hasMiravaExternalImageGenerationConsent(
  userId: string,
): Promise<boolean> {
  const status =
    await getMiravaPrivacyStatus(
      userId,
    )

  return (
    status
      .externalImageGenerationAccepted ===
    true
  )
}

export async function requireMiravaExternalImageGenerationConsent(
  userId: string,
) {
  const status =
    await getMiravaPrivacyStatus(
      userId,
    )

  if (
    !status
      .externalImageGenerationAccepted
  ) {
    throw new Error(
      "MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_MISSING",
    )
  }

  return status
}

export async function withdrawMiravaExternalImageGenerationConsent(
  args: {
    userId: string
    locale?: "fr" | "es"
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  await recordEvent({
    userId:
      args.userId,
    locale:
      args.locale ?? "fr",
    source:
      args.source,
    purpose:
      "external_image_generation",
    decision:
      "withdrawn",
    documentVersion:
      MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION,
  })

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function setMiravaAnalyticsDecision(
  args: {
    userId: string
    locale: "fr" | "es"
    accepted: boolean
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  await recordEvent({
    userId:
      args.userId,
    locale:
      args.locale,
    source:
      args.source,
    purpose:
      "analytics",
    decision:
      args.accepted
        ? "accepted"
        : "refused",
    documentVersion:
      MIRAVA_ANALYTICS_CONSENT_VERSION,
  })

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function withdrawMiravaOpenAiIdentityAnalysisConsent(
  args: {
    userId: string
    locale?: "fr" | "es"
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  await recordEvent({
    userId:
      args.userId,
    locale:
      args.locale ?? "fr",
    source:
      args.source,
    purpose:
      "openai_identity_analysis",
    decision:
      "withdrawn",
    documentVersion:
      MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION,
  })

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function withdrawMiravaIdentityConsent(
  args: {
    userId: string
    locale?: "fr" | "es"
    source: string
  },
): Promise<MiravaPrivacyStatus> {
  const current =
    await getMiravaPrivacyStatus(
      args.userId,
    )

  await recordEvent({
    userId:
      args.userId,
    locale:
      args.locale ?? "fr",
    source:
      args.source,
    purpose:
      "identity_processing",
    decision:
      "withdrawn",
    documentVersion:
      MIRAVA_IDENTITY_CONSENT_VERSION,
  })

  /*
   * General identity withdrawal also revokes any
   * still-active provider-specific authorization.
   * Evidence remains append-only.
   */
  if (
    current
      .openaiIdentityAnalysisAccepted
  ) {
    await recordEvent({
      userId:
        args.userId,
      locale:
        args.locale ?? "fr",
      source:
        args.source,
      purpose:
        "openai_identity_analysis",
      decision:
        "withdrawn",
      documentVersion:
        MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION,
    })
  }

  if (
    current
      .externalImageGenerationAccepted
  ) {
    await recordEvent({
      userId:
        args.userId,
      locale:
        args.locale ?? "fr",
      source:
        args.source,
      purpose:
        "external_image_generation",
      decision:
        "withdrawn",
      documentVersion:
        MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION,
    })
  }

  return getMiravaPrivacyStatus(
    args.userId,
  )
}

export async function requireMiravaExternalIdentityAnalysisConsent(
  userId: string,
) {
  const status =
    await getMiravaPrivacyStatus(
      userId,
    )

  /*
   * Migration compatibility:
   *
   * Existing durable consent evidence is still stored
   * under the historical OpenAI-specific purpose.
   *
   * The current user disclosure is provider-neutral,
   * therefore runtime code uses this neutral primitive
   * without rewriting append-only consent history.
   */
  if (
    !status
      .openaiIdentityAnalysisAccepted
  ) {
    throw new Error(
      "MIRAVA_EXTERNAL_IDENTITY_ANALYSIS_CONSENT_MISSING",
    )
  }

  return status
}

export async function requireMiravaRequiredConsents(
  userId: string,
) {
  const status =
    await getMiravaPrivacyStatus(
      userId,
    )

  if (
    !status.requiredAccepted
  ) {
    throw new Error(
      "MIRAVA_REQUIRED_CONSENT_MISSING",
    )
  }

  return status
}

export async function requireMiravaIdentityConsent(
  userId: string,
) {
  const status =
    await getMiravaPrivacyStatus(
      userId,
    )

  if (
    !status
      .identityProcessingAccepted
  ) {
    throw new Error(
      "MIRAVA_IDENTITY_CONSENT_MISSING",
    )
  }

  return status
}

export async function requireMiravaOpenAiIdentityAnalysisConsent(
  userId: string,
) {
  const status =
    await getMiravaPrivacyStatus(
      userId,
    )

  if (
    !status
      .openaiIdentityAnalysisAccepted
  ) {
    throw new Error(
      "MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_MISSING",
    )
  }

  return status
}
