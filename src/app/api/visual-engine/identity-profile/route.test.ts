import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  checkRateLimit: vi.fn(),
  getIdentityProfilePublic: vi.fn(),
  replaceIdentityProfile: vi.fn(),
  replaceIdentityProfileFromStagedUploads: vi.fn(),
  appendIdentityProfileFromStagedUploads: vi.fn(),
  appendIdentityProfile: vi.fn(),
  deleteIdentityProfile: vi.fn(),
  studioErrorResponse: vi.fn(),
  recordMiravaAudit: vi.fn(),
  requireMiravaIdentityConsent: vi.fn(),
  withdrawMiravaIdentityConsent: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/visual-engine/core", () => ({
  MIN_IDENTITY_ASSETS: 3,
  MAX_IDENTITY_ASSETS: 10,
  getIdentityProfilePublic: mocks.getIdentityProfilePublic,
  replaceIdentityProfile: mocks.replaceIdentityProfile,
  replaceIdentityProfileFromStagedUploads:
    mocks.replaceIdentityProfileFromStagedUploads,
  appendIdentityProfileFromStagedUploads:
    mocks.appendIdentityProfileFromStagedUploads,
  appendIdentityProfile: mocks.appendIdentityProfile,
  deleteIdentityProfile: mocks.deleteIdentityProfile,
  studioErrorResponse: mocks.studioErrorResponse,
}))
vi.mock("@/lib/visual-engine/audit", () => ({ recordMiravaAudit: mocks.recordMiravaAudit }))
vi.mock("@/lib/visual-engine/privacy", () => ({
  requireMiravaIdentityConsent: mocks.requireMiravaIdentityConsent,
  withdrawMiravaIdentityConsent: mocks.withdrawMiravaIdentityConsent,
}))

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

function stagedIdentityUpload() {
  return new NextRequest(
    "https://mirava.test/api/visual-engine/identity-profile",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.20",
      },
      body: JSON.stringify({
        mode: "replace-staged",
        batchId:
          "11111111-1111-4111-8111-111111111111",
        uploads: [
          {
            path:
              "user-1/identity-staging/11111111-1111-4111-8111-111111111111/1.jpg",
            mimeType: "image/jpeg",
            bytes: 1024,
          },
          {
            path:
              "user-1/identity-staging/11111111-1111-4111-8111-111111111111/2.jpg",
            mimeType: "image/jpeg",
            bytes: 1024,
          },
          {
            path:
              "user-1/identity-staging/11111111-1111-4111-8111-111111111111/3.jpg",
            mimeType: "image/jpeg",
            bytes: 1024,
          },
        ],
        ageConfirmed: true,
        rightsConfirmed: true,
        retentionAccepted: true,
      }),
    },
  )
}

describe("MIRAVA identity profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mocks.requireMiravaIdentityConsent.mockResolvedValue({ identityProcessingAccepted: true })
    mocks.withdrawMiravaIdentityConsent.mockResolvedValue({ identityProcessingAccepted: false })
    mocks.replaceIdentityProfile.mockResolvedValue({ id: "profile-1", assetCount: 3, previews: [] })
    mocks.replaceIdentityProfileFromStagedUploads.mockResolvedValue({ id: "profile-1", assetCount: 3, previews: [] })
    mocks.appendIdentityProfileFromStagedUploads.mockResolvedValue({ id: "profile-1", assetCount: 4, previews: [] })
    mocks.appendIdentityProfile.mockResolvedValue({ id: "profile-1", assetCount: 4, previews: [] })
    mocks.studioErrorResponse.mockReturnValue({ message: "Une erreur Studio est survenue.", status: 500 })
  })

  it("does not allow anonymous reads or writes of identity material", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await POST(identityUpload())

    expect(response.status).toBe(401)
    expect(mocks.replaceIdentityProfile).not.toHaveBeenCalled()
  })

  it(
    "rejects the retired multipart identity upload path",
    async () => {
      const response =
        await POST(
          identityUpload(),
        )

      expect(
        response.status,
      ).toBe(415)

      expect(
        mocks.replaceIdentityProfileFromStagedUploads,
      ).not.toHaveBeenCalled()

      expect(
        mocks.appendIdentityProfileFromStagedUploads,
      ).not.toHaveBeenCalled()
    },
  )

  it("finalizes direct private uploads from a small JSON request", async () => {
    const response = await POST(
      stagedIdentityUpload(),
    )

    expect(response.status).toBe(200)
    expect(
      mocks.replaceIdentityProfileFromStagedUploads,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        batchId:
          "11111111-1111-4111-8111-111111111111",
        ageConfirmed: true,
        rightsConfirmed: true,
        retentionAccepted: true,
        uploads: expect.arrayContaining([
          expect.objectContaining({
            mimeType: "image/jpeg",
            bytes: 1024,
          }),
        ]),
      }),
    )
  })

  it("returns a conflict when identity consent was withdrawn", async () => {
    mocks.requireMiravaIdentityConsent.mockRejectedValueOnce(
      new Error(
        "MIRAVA_IDENTITY_CONSENT_MISSING",
      ),
    )

    const response = await POST(
      stagedIdentityUpload(),
    )

    expect(response.status).toBe(409)

    await expect(
      response.json(),
    ).resolves.toEqual({
      error:
        "Le consentement au traitement du Profil identité doit être renouvelé avant l’enregistrement.",
    })

    expect(
      mocks.replaceIdentityProfileFromStagedUploads,
    ).not.toHaveBeenCalled()
  })

  it("records an auditable server-side deletion", async () => {
    const response = await DELETE()

    expect(response.status).toBe(200)
    expect(mocks.deleteIdentityProfile).toHaveBeenCalledWith("user-1")
    expect(mocks.withdrawMiravaIdentityConsent).toHaveBeenCalledWith({
      userId: "user-1",
      source: "identity-profile-delete",
    })
    expect(mocks.withdrawMiravaIdentityConsent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteIdentityProfile.mock.invocationCallOrder[0],
    )
    expect(mocks.recordMiravaAudit).toHaveBeenCalledWith("user-1", "IDENTITY_PROFILE_DELETED", "identity-profile")
  })

  it("keeps consent withdrawn when private storage deletion fails", async () => {
    mocks.deleteIdentityProfile.mockRejectedValueOnce(
      new Error("IDENTITY_DELETION_STORAGE_ERROR"),
    )

    const response = await DELETE()

    expect(response.status).toBe(500)
    expect(mocks.withdrawMiravaIdentityConsent).toHaveBeenCalledOnce()
    expect(mocks.recordMiravaAudit).not.toHaveBeenCalled()
  })
})
