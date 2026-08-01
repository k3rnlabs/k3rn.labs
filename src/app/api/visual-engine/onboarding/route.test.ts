import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique, update: mocks.update } } }))

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

  it("stores MIRAVA state inside preferences without touching global onboarding", async () => {
    const response = await PATCH(request({
      action: "complete",
      firstName: "Amina",
      universeIds: [MIRAVA_UNIVERSES[0].id],
      goal: "campaign",
      identityIntent: "later",
    }))

    expect(response.status).toBe(200)
    const update = mocks.update.mock.calls[0][0]
    expect(update.where).toEqual({ id: "user-1" })
    expect(update.data.firstName).toBe("Amina")
    expect(update.data.preferences.keep).toBe("existing")
    expect(update.data.preferences.miravaOnboarding).toMatchObject({
      version: 2, status: "completed", step: 7, universeIds: [MIRAVA_UNIVERSES[0].id], goal: "campaign", identityIntent: "later",
    })
    expect(update.data).not.toHaveProperty("onboardingCompleted")
  })

  it("persists a resumable draft as each meaningful answer is submitted", async () => {
    const response = await PATCH(request({
      action: "progress",
      step: 2,
      universeIds: [MIRAVA_UNIVERSES[1].id],
    }))

    expect(response.status).toBe(200)
    expect(mocks.update.mock.calls[0][0].data.preferences.miravaOnboarding).toMatchObject({
      version: 2, status: "in_progress", step: 2, universeIds: [MIRAVA_UNIVERSES[1].id],
    })
  })
})
