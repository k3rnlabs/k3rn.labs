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
  createSignedUploadUrl: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  verifySession: mocks.verifySession,
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock("@/lib/visual-engine/core", () => ({
  MIN_IDENTITY_ASSETS: 3,
  MAX_IDENTITY_ASSETS: 10,
  MAX_STUDIO_IMAGE_BYTES:
    10 * 1024 * 1024,
  STUDIO_BUCKET:
    "visual-engine-private",
}))

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    storage: {
      from: mocks.from,
    },
  },
}))

import { POST } from "./route"

describe("MIRAVA signed identity upload session", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.verifySession.mockResolvedValue({
      userId: "user-1",
    })

    mocks.checkRateLimit.mockResolvedValue({
      success: true,
    })

    mocks.createSignedUploadUrl.mockImplementation(
      async (path: string) => ({
        data: {
          path,
          token: `token:${path}`,
          signedUrl:
            `https://storage.test/${path}`,
        },
        error: null,
      }),
    )

    mocks.remove.mockResolvedValue({
      error: null,
    })

    mocks.from.mockReturnValue({
      createSignedUploadUrl:
        mocks.createSignedUploadUrl,
      remove: mocks.remove,
    })
  })

  it("creates one private signed target per identity master", async () => {
    const request = new NextRequest(
      "https://mirava.test/api/visual-engine/identity-profile/upload-session",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          files: [
            {
              mimeType: "image/jpeg",
              bytes: 2_000_000,
            },
            {
              mimeType: "image/jpeg",
              bytes: 2_100_000,
            },
            {
              mimeType: "image/jpeg",
              bytes: 2_200_000,
            },
          ],
        }),
      },
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bucket).toBe(
      "visual-engine-private",
    )
    expect(data.uploads).toHaveLength(3)
    expect(
      mocks.createSignedUploadUrl,
    ).toHaveBeenCalledTimes(3)

    for (const upload of data.uploads) {
      expect(upload.path).toContain(
        "user-1/identity-staging/",
      )
      expect(upload.token).toContain(
        "token:",
      )
    }
  })

  it("rejects a master larger than the private image limit", async () => {
    const request = new NextRequest(
      "https://mirava.test/api/visual-engine/identity-profile/upload-session",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          files: [
            {
              mimeType: "image/jpeg",
              bytes: 11 * 1024 * 1024,
            },
            {
              mimeType: "image/jpeg",
              bytes: 2_000_000,
            },
            {
              mimeType: "image/jpeg",
              bytes: 2_000_000,
            },
          ],
        }),
      },
    )

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(
      mocks.createSignedUploadUrl,
    ).not.toHaveBeenCalled()
  })
})
