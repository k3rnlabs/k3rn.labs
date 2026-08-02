import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  findUnique: vi.fn(),
  findIdentityProfile: vi.fn(),
  findCreation: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/db", () => ({ db: {
  user: { findUnique: mocks.findUnique, update: mocks.update },
  studioIdentityProfile: { findUnique: mocks.findIdentityProfile },
  studioCreation: { findUnique: mocks.findCreation },
} }))

import { GET, PATCH } from "./route"

function request(body: unknown) {
  return new NextRequest("https://mirava.test/api/visual-engine/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("MIRAVA first-access onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.findUnique.mockResolvedValue({ firstName: null, preferences: { keep: "existing" } })
    mocks.update.mockResolvedValue({})
  })

  it("requires an authenticated owner before reading their onboarding state", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it("stores MIRAVA progress inside preferences without touching global onboarding", async () => {
    const response = await PATCH(request({
      action: "progress",
      currentStep: "objective",
      firstName: "Amina",
    }))

    expect(response.status).toBe(200)
    const update = mocks.update.mock.calls[0][0]
    expect(update.where).toEqual({ id: "user-1" })
    expect(update.data.firstName).toBe("Amina")
    expect(update.data.preferences.keep).toBe("existing")
    expect(update.data.preferences.miravaOnboarding).toMatchObject({
      version: 3, status: "in_progress", currentStep: "objective", universeIds: [],
    })
    expect(update.data).not.toHaveProperty("onboardingCompleted")
  })

  it("persists a resumable draft as each meaningful answer is submitted", async () => {
    const response = await PATCH(request({
      action: "progress",
      currentStep: "direction_review",
      universeIds: [MIRAVA_UNIVERSES[1].id],
      goal: "campaign",
      direction: { primaryUniverseId: MIRAVA_UNIVERSES[1].id, sessionType: "campaign_series", recommendedFormats: ["Publication", "Story"] },
    }))

    expect(response.status).toBe(200)
    expect(mocks.update.mock.calls[0][0].data.preferences.miravaOnboarding).toMatchObject({
      version: 3, status: "in_progress", currentStep: "direction_review", universeIds: [MIRAVA_UNIVERSES[1].id], goal: "campaign",
    })
  })

  it("records the identity disclosure before camera or library access", async () => {
    const response = await PATCH(request({
      action: "progress",
      currentStep: "capture_activation",
      goal: "presence",
      universeIds: [MIRAVA_UNIVERSES[0].id],
      direction: { primaryUniverseId: MIRAVA_UNIVERSES[0].id, sessionType: "portrait_editorial", recommendedFormats: ["Portrait"] },
      identityConsentAccepted: true,
    }))

    expect(response.status).toBe(200)
    expect(mocks.update.mock.calls[0][0].data.preferences.miravaOnboarding.identityConsentAt).toEqual(expect.any(String))
  })

  it("rejects a jump to identity capture when required answers are missing", async () => {
    const response = await PATCH(request({ action: "progress", currentStep: "capture_activation", identityConsentAccepted: true }))

    expect(response.status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("keeps an already prepared session when the user only navigates backward", async () => {
    mocks.findUnique.mockResolvedValue({ preferences: { miravaOnboarding: {
      version: 3, status: "session_ready", currentStep: "capture_activation", universeIds: [MIRAVA_UNIVERSES[0].id], goal: "presence",
      direction: { primaryUniverseId: MIRAVA_UNIVERSES[0].id, sessionType: "portrait_editorial", recommendedFormats: ["Portrait"] },
      identityConsentAt: new Date().toISOString(), firstSessionId: "creation-1", updatedAt: new Date().toISOString(),
    } } })

    const response = await PATCH(request({ action: "progress", currentStep: "identity_permission" }))

    expect(response.status).toBe(200)
    expect(mocks.update.mock.calls[0][0].data.preferences.miravaOnboarding).toMatchObject({
      status: "session_ready", currentStep: "identity_permission", firstSessionId: "creation-1",
    })
  })

  it("migrates an old completed flag to the first genuinely incomplete requirement", async () => {
    mocks.findUnique.mockResolvedValue({ firstName: "Amina", preferences: { miravaOnboarding: {
      version: 2, status: "completed", step: 7, universeIds: [MIRAVA_UNIVERSES[0].id], goal: "campaign",
      identityIntent: "later", updatedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    } } })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.onboarding).toMatchObject({ version: 3, status: "in_progress", currentStep: "identity_permission", goal: "campaign" })
    expect(data.onboarding).not.toHaveProperty("firstSessionId")
  })

  it("does not declare a session ready without a complete owned identity profile", async () => {
    mocks.findUnique.mockResolvedValue({ preferences: { miravaOnboarding: {
      version: 3, status: "in_progress", currentStep: "capture_activation", universeIds: [MIRAVA_UNIVERSES[0].id], goal: "presence",
      direction: { primaryUniverseId: MIRAVA_UNIVERSES[0].id, sessionType: "portrait_editorial", recommendedFormats: ["Portrait"] },
      identityConsentAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } } })
    mocks.findIdentityProfile.mockResolvedValue({ id: "profile-1", _count: { assets: 2 } })
    mocks.findCreation.mockResolvedValue({ id: "creation-1", identityProfileId: "profile-1" })

    const response = await PATCH(request({ action: "session_ready", firstSessionId: "creation-1" }))

    expect(response.status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("activates only while the real first session remains linked to a valid profile", async () => {
    mocks.findUnique.mockResolvedValue({ preferences: { miravaOnboarding: {
      version: 3, status: "session_ready", currentStep: "capture_activation", universeIds: [MIRAVA_UNIVERSES[0].id], goal: "presence",
      direction: { primaryUniverseId: MIRAVA_UNIVERSES[0].id, sessionType: "portrait_editorial", recommendedFormats: ["Portrait"] },
      identityConsentAt: new Date().toISOString(), firstSessionId: "creation-1", updatedAt: new Date().toISOString(),
    } } })
    mocks.findIdentityProfile.mockResolvedValue({ id: "profile-1", _count: { assets: 3 } })
    mocks.findCreation.mockResolvedValue({ id: "creation-1", identityProfileId: "profile-1" })

    const response = await PATCH(request({ action: "activate" }))

    expect(response.status).toBe(200)
    expect(mocks.update.mock.calls[0][0].data.preferences.miravaOnboarding).toMatchObject({
      status: "activated", firstSessionId: "creation-1", activatedAt: expect.any(String),
    })
  })
})
