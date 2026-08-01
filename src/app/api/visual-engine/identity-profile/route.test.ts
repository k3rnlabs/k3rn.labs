import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  checkRateLimit: vi.fn(),
  getIdentityProfilePublic: vi.fn(),
  replaceIdentityProfile: vi.fn(),
  appendIdentityProfile: vi.fn(),
  deleteIdentityProfile: vi.fn(),
  updateIdentityProfilePhysicalTraits: vi.fn(),
  studioErrorResponse: vi.fn(),
  recordMiravaAudit: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/visual-engine/core", () => ({
  MIN_IDENTITY_ASSETS: 3,
  MAX_IDENTITY_ASSETS: 6,
  getIdentityProfilePublic: mocks.getIdentityProfilePublic,
  replaceIdentityProfile: mocks.replaceIdentityProfile,
  appendIdentityProfile: mocks.appendIdentityProfile,
  deleteIdentityProfile: mocks.deleteIdentityProfile,
  updateIdentityProfilePhysicalTraits: mocks.updateIdentityProfilePhysicalTraits,
  studioErrorResponse: mocks.studioErrorResponse,
}))
vi.mock("@/lib/visual-engine/audit", () => ({ recordMiravaAudit: mocks.recordMiravaAudit }))

import { DELETE, POST } from "./route"

function identityUpload({ mode = "replace", count = 3, consent = true }: { mode?: "replace" | "append"; count?: number; consent?: boolean } = {}) {
  const form = new FormData()
  form.set("mode", mode)
  form.set("ageConfirmed", String(consent))
  form.set("rightsConfirmed", String(consent))
  form.set("retentionAccepted", String(consent))
  for (let index = 0; index < count; index += 1) {
    form.append("file", new File([new Uint8Array([137, 80, 78, 71])], `identity-${index}.png`, { type: "image/png" }))
  }
  return new NextRequest("https://mirava.test/api/visual-engine/identity-profile", {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100.20" },
    body: form,
  })
}

describe("MIRAVA identity profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mocks.replaceIdentityProfile.mockResolvedValue({ id: "profile-1", assetCount: 3, previews: [] })
    mocks.appendIdentityProfile.mockResolvedValue({ id: "profile-1", assetCount: 4, previews: [] })
    mocks.studioErrorResponse.mockReturnValue({ message: "Une erreur Studio est survenue.", status: 500 })
  })

  it("does not allow anonymous reads or writes of identity material", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await POST(identityUpload())

    expect(response.status).toBe(401)
    expect(mocks.replaceIdentityProfile).not.toHaveBeenCalled()
  })

  it("requires three private views for a replacement identity profile", async () => {
    const response = await POST(identityUpload({ count: 2 }))

    expect(response.status).toBe(400)
    expect(mocks.replaceIdentityProfile).not.toHaveBeenCalled()
  })

  it("passes consent, ownership and binary files only to the private profile service", async () => {
    const response = await POST(identityUpload())

    expect(response.status).toBe(200)
    expect(mocks.replaceIdentityProfile).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      ageConfirmed: true,
      rightsConfirmed: true,
      retentionAccepted: true,
      files: expect.arrayContaining([expect.objectContaining({ mimeType: "image/png", buffer: expect.any(Buffer) })]),
    }))
    expect(mocks.recordMiravaAudit).toHaveBeenCalledWith("user-1", "IDENTITY_PROFILE_UPDATED", "identity-onboarding")
  })

  it("permits a single additional view only through append mode", async () => {
    const response = await POST(identityUpload({ mode: "append", count: 1 }))

    expect(response.status).toBe(200)
    expect(mocks.appendIdentityProfile).toHaveBeenCalledOnce()
    expect(mocks.replaceIdentityProfile).not.toHaveBeenCalled()
  })

  it("records an auditable server-side deletion", async () => {
    const response = await DELETE()

    expect(response.status).toBe(200)
    expect(mocks.deleteIdentityProfile).toHaveBeenCalledWith("user-1")
    expect(mocks.recordMiravaAudit).toHaveBeenCalledWith("user-1", "IDENTITY_PROFILE_DELETED", "identity-profile")
  })
})
