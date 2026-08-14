export const MIRAVA_KIE_ANALYSIS_MODEL =
  process.env.MIRAVA_KIE_ANALYSIS_MODEL ??
  "gpt-5-6-sol"

export const MIRAVA_ANALYSIS_MODEL =
  MIRAVA_KIE_ANALYSIS_MODEL

export const MIRAVA_ANALYSIS_FALLBACK_MODEL =
  MIRAVA_KIE_ANALYSIS_MODEL
// Alma only needs concise bilingual direction and validated JSON actions. Keep the
// image-analysis model separate from this low-latency, cost-sensitive interaction.
export const MIRAVA_CREATIVE_DIRECTOR_MODEL = process.env.MIRAVA_CREATIVE_DIRECTOR_MODEL ?? "gpt-5-mini"
export const MIRAVA_IMAGE_MODEL = process.env.MIRAVA_IMAGE_MODEL ?? "gpt-image-2"
export const MIRAVA_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_MIRAVA_PUSH_PUBLIC_KEY

export function isMiravaPublicLaunchEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.MIRAVA_PUBLIC_LAUNCH_ENABLED !== "false"
}

export const MIRAVA_KIE_IMAGE_MODEL =
  process.env.MIRAVA_KIE_IMAGE_MODEL ??
  "seedream/4.5-edit"

export const MIRAVA_KIE_IMAGE_POLL_WINDOW_MS =
  Number(
    process.env.MIRAVA_KIE_IMAGE_POLL_WINDOW_MS ??
      "85000",
  )

export function isMiravaKieImageProviderEnabled(): boolean {
  const enabled =
    process.env.MIRAVA_KIE_IMAGE_PROVIDER_ENABLED ===
    "true"

  const configured =
    Boolean(
      process.env.KIE_API_KEY?.trim(),
    )

  /*
   * Kie receives private identity/reference images when this provider is used.
   * Local/dev can opt in immediately. Production remains fail-closed until
   * the privacy/consent disclosure for this external processor is shipped.
   */
  const productionDisclosureReady =
    process.env.NODE_ENV !== "production" ||
    process.env
      .MIRAVA_KIE_EXTERNAL_PROCESSING_DISCLOSED ===
      "true"

  return (
    enabled &&
    configured &&
    productionDisclosureReady
  )
}

export type MiravaFaceIdentityGateMode =
  | "off"
  | "shadow"
  | "required"

export function getMiravaFaceIdentityGateMode(): MiravaFaceIdentityGateMode {
  const configured =
    process.env
      .MIRAVA_FACE_IDENTITY_GATE_MODE
      ?.trim()
      .toLowerCase()

  return configured === "shadow" ||
    configured === "required"
    ? configured
    : "off"
}
