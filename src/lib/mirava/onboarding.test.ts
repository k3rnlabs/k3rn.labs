import { describe, expect, it } from "vitest"
import { isMiravaOnboardingCompleted, type MiravaOnboardingState } from "./onboarding"

const base: MiravaOnboardingState = {
  version: 4,
  status: "in_progress",
  currentStep: "capture_activation",
  universeIds: ["escapade-solaire"],
  updatedAt: new Date(0).toISOString(),
}

describe("MIRAVA onboarding activation", () => {
  it("does not trust navigation progress or a prepared session alone", () => {
    expect(isMiravaOnboardingCompleted(base)).toBe(false)
    expect(isMiravaOnboardingCompleted({ ...base, status: "session_ready", firstSessionId: "creation-1" })).toBe(false)
  })

  it("requires both an activation timestamp and a real first session identifier", () => {
    expect(isMiravaOnboardingCompleted({ ...base, status: "activated", activatedAt: new Date().toISOString() })).toBe(false)
    expect(isMiravaOnboardingCompleted({ ...base, status: "activated", activatedAt: new Date().toISOString(), firstSessionId: "creation-1" })).toBe(true)
  })
})
