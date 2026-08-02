export const MIRAVA_ONBOARDING_VERSION = 3 as const

export const MIRAVA_ONBOARDING_STEPS = [
  "promise_name",
  "objective",
  "visual_universes",
  "direction_review",
  "identity_permission",
  "capture_activation",
] as const

export type MiravaOnboardingStepId = typeof MIRAVA_ONBOARDING_STEPS[number]
export type MiravaOnboardingGoal = "presence" | "campaign" | "portfolio"
export type MiravaOnboardingStatus = "in_progress" | "session_ready" | "activated"

export type MiravaOnboardingDirection = {
  primaryUniverseId: string
  sessionType: "portrait_editorial" | "campaign_series" | "signature_series"
  recommendedFormats: string[]
}

export type MiravaOnboardingState = {
  version: typeof MIRAVA_ONBOARDING_VERSION
  status: MiravaOnboardingStatus
  currentStep: MiravaOnboardingStepId
  universeIds: string[]
  goal?: MiravaOnboardingGoal
  direction?: MiravaOnboardingDirection
  identityConsentAt?: string
  firstSessionId?: string
  updatedAt: string
  activatedAt?: string
}

export function onboardingStepIndex(step: MiravaOnboardingStepId): number {
  return MIRAVA_ONBOARDING_STEPS.indexOf(step)
}

export function isMiravaOnboardingCompleted(state: MiravaOnboardingState | null | undefined): boolean {
  return state?.status === "activated" && Boolean(state.activatedAt && state.firstSessionId)
}
