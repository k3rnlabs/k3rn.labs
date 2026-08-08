import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  checkRateLimit: vi.fn(),
  isMiravaPublicLaunchEnabled: vi.fn(),
  ensureStudioActivation: vi.fn(),
  listStudioCreations: vi.fn(),
  createStudioCreation: vi.fn(),
  studioCreationPublic: vi.fn(),
  studioErrorResponse: vi.fn(),
  recordMiravaAudit: vi.fn(),
  requireMiravaRequiredConsents: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/mirava/server-config", () => ({ isMiravaPublicLaunchEnabled: mocks.isMiravaPublicLaunchEnabled }))
vi.mock("@/lib/visual-engine/core", () => ({
  ensureStudioActivation: mocks.ensureStudioActivation,
  listStudioCreations: mocks.listStudioCreations,
  createStudioCreation: mocks.createStudioCreation,
  studioCreationPublic: mocks.studioCreationPublic,
  studioErrorResponse: mocks.studioErrorResponse,
}))
vi.mock("@/lib/visual-engine/audit", () => ({ recordMiravaAudit: mocks.recordMiravaAudit }))
vi.mock("@/lib/visual-engine/privacy", () => ({ requireMiravaRequiredConsents: mocks.requireMiravaRequiredConsents }))

import { GET, POST } from "./route"

function request(body: unknown) {
  return new NextRequest("https://mirava.test/api/visual-engine/creations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: JSON.stringify(body),
  })
}

const validCreation = {
  ageConfirmed: true,
  rightsConfirmed: true,
  privacyAccepted: true,
  openaiDisclosureAccepted: true,
  presetId: "escapade-solaire",
  creativeOptions: { seriesSize: 1 },
}

describe("MIRAVA creations route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 19 })
    mocks.isMiravaPublicLaunchEnabled.mockReturnValue(true)
    mocks.ensureStudioActivation.mockResolvedValue(3)
    mocks.listStudioCreations.mockResolvedValue([])
    mocks.requireMiravaRequiredConsents.mockResolvedValue({ requiredAccepted: true })
    mocks.createStudioCreation.mockResolvedValue({ id: "creation-1", masterPrompt: "server-only" })
    mocks.studioCreationPublic.mockReturnValue({ id: "creation-1", status: "DRAFT", requestedResultCount: 1 })
    mocks.studioErrorResponse.mockReturnValue({ message: "Une erreur Studio est survenue.", status: 500 })
  })

  it("does not expose the private creation list to a missing session", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.ensureStudioActivation).not.toHaveBeenCalled()
    expect(mocks.listStudioCreations).not.toHaveBeenCalled()
  })

  it("keeps public launch closed before accepting a billable creation", async () => {
    mocks.isMiravaPublicLaunchEnabled.mockReturnValue(false)

    const response = await POST(request(validCreation))

    expect(response.status).toBe(503)
    expect(mocks.createStudioCreation).not.toHaveBeenCalled()
    expect(mocks.recordMiravaAudit).not.toHaveBeenCalled()
  })

  it("requires every consent before creating a private Studio record", async () => {
    const response = await POST(request({ ...validCreation, rightsConfirmed: false }))

    expect(response.status).toBe(400)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(mocks.createStudioCreation).not.toHaveBeenCalled()
  })

  it("returns only the public DTO after a guarded creation", async () => {
    const response = await POST(request(validCreation))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ creation: { id: "creation-1", status: "DRAFT", requestedResultCount: 1 } })
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("studioCreation", "user-1:198.51.100.20")
    expect(mocks.requireMiravaRequiredConsents).toHaveBeenCalledWith("user-1")
    expect(mocks.createStudioCreation).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", presetId: "escapade-solaire" }))
    expect(mocks.studioCreationPublic).toHaveBeenCalledWith(expect.objectContaining({ masterPrompt: "server-only" }))
    expect(mocks.recordMiravaAudit).toHaveBeenCalledWith("user-1", "CREATED", "creation-1")
  })

  it("derives the onboarding idempotency key from the authenticated owner", async () => {
    const response = await POST(request({
      ...validCreation,
      onboarding: true,
    }))

    expect(response.status).toBe(201)
    expect(
      mocks.createStudioCreation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        onboardingKey:
          "mirava-onboarding:v4:user-1",
      }),
    )
  })
})
