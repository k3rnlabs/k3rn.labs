export const MIRAVA_ONBOARDING_VERSION = 2 as const

export const MIRAVA_ONBOARDING_STEPS = [
  "welcome_name",
  "promise",
  "how_it_works",
  "universes",
  "goal",
  "creative_direction",
  "identity_control",
  "studio_ready",
] as const

export type MiravaOnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type MiravaOnboardingGoal = "presence" | "campaign" | "portfolio"
export type MiravaIdentityIntent = "now" | "later"
export type MiravaOnboardingStatus = "in_progress" | "completed"

export type MiravaOnboardingState = {
  version: typeof MIRAVA_ONBOARDING_VERSION
  status: MiravaOnboardingStatus
  step: MiravaOnboardingStep
  universeIds: string[]
  goal?: MiravaOnboardingGoal
  identityIntent?: MiravaIdentityIntent
  updatedAt: string
  completedAt?: string
}

export function isMiravaOnboardingCompleted(state: MiravaOnboardingState | null | undefined): boolean {
  return state?.status === "completed" && Boolean(state.completedAt)
}
