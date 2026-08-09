import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  checkRateLimit: vi.fn(),
  replaceAsset: vi.fn(),
  deleteAsset: vi.fn(),
  requireIdentityConsent: vi.fn(),
  audit: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  verifySession: mocks.verifySession,
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock("@/lib/visual-engine/core", () => ({
  replaceIdentityAssetFromStagedUpload:
    mocks.replaceAsset,
  deleteIdentityAsset:
    mocks.deleteAsset,
  studioErrorResponse: () => ({
    message: "error",
    status: 500,
  }),
}))

vi.mock("@/lib/visual-engine/privacy", () => ({
  requireMiravaIdentityConsent:
    mocks.requireIdentityConsent,
}))

vi.mock("@/lib/visual-engine/audit", () => ({
  recordMiravaAudit: mocks.audit,
}))

import {
  DELETE,
  POST,
} from "./route"

describe("MIRAVA individual identity assets", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.verifySession.mockResolvedValue({
      userId: "user-1",
    })

    mocks.checkRateLimit.mockResolvedValue({
      success: true,
    })

    mocks.requireIdentityConsent
      .mockResolvedValue(undefined)

    mocks.replaceAsset.mockResolvedValue({
      id: "profile-1",
      assetCount: 4,
      previews: [],
    })

    mocks.deleteAsset.mockResolvedValue({
      id: "profile-1",
      assetCount: 3,
      previews: [],
    })
  })

  it("replaces one staged private photo", async () => {
    const request = new NextRequest(
      "https://mirava.test/api/visual-engine/identity-profile/assets/asset-1",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          batchId:
            "11111111-1111-4111-8111-111111111111",
          upload: {
            path:
              "user-1/identity-staging/11111111-1111-4111-8111-111111111111/new.jpg",
            mimeType: "image/jpeg",
            bytes: 2048,
          },
        }),
      },
    )

    const response = await POST(
      request,
      {
        params: {
          id: "asset-1",
        },
      },
    )

    expect(response.status).toBe(200)
    expect(
      mocks.replaceAsset,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        assetId: "asset-1",
      }),
    )
  })

  it("deletes one owned private photo", async () => {
    const request = new NextRequest(
      "https://mirava.test/api/visual-engine/identity-profile/assets/asset-1",
      {
        method: "DELETE",
      },
    )

    const response = await DELETE(
      request,
      {
        params: {
          id: "asset-1",
        },
      },
    )

    expect(response.status).toBe(200)
    expect(
      mocks.deleteAsset,
    ).toHaveBeenCalledWith({
      userId: "user-1",
      assetId: "asset-1",
    })
  })
})
