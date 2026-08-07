import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import {
  NextRequest,
} from "next/server"

const mocks =
  vi.hoisted(() => ({
    verifySession:
      vi.fn(),
    checkRateLimit:
      vi.fn(),
    launchEnabled:
      vi.fn(),
    finalizeLook:
      vi.fn(),
    getSession:
      vi.fn(),
  }))

vi.mock(
  "@/lib/auth",
  () => ({
    verifySession:
      mocks.verifySession,
  }),
)

vi.mock(
  "@/lib/rate-limit",
  () => ({
    checkRateLimit:
      mocks.checkRateLimit,
  }),
)

vi.mock(
  "@/lib/mirava/server-config",
  () => ({
    isMiravaPublicLaunchEnabled:
      mocks.launchEnabled,
  }),
)

vi.mock(
  "@/lib/mirava/session-builder/look-store",
  () => {
    class MockLookStoreError
      extends Error {
      code: string

      constructor(
        code: string,
        message = code,
      ) {
        super(message)
        this.name =
          "MiravaSessionLookStoreError"
        this.code = code
      }
    }

    return {
      MiravaSessionLookStoreError:
        MockLookStoreError,
      finalizeMiravaSessionLookItem:
        mocks.finalizeLook,
    }
  },
)

vi.mock(
  "@/lib/mirava/session-builder/session-store",
  () => {
    class MockSessionStoreError
      extends Error {
      code: string

      constructor(
        code: string,
        message = code,
      ) {
        super(message)
        this.name =
          "MiravaSessionBuilderStoreError"
        this.code = code
      }
    }

    return {
      MiravaSessionBuilderStoreError:
        MockSessionStoreError,
      getMiravaSessionBuilderDraft:
        mocks.getSession,
    }
  },
)

import {
  MiravaSessionLookStoreError,
} from "@/lib/mirava/session-builder/look-store"
import {
  POST,
} from "./route"

const batchId =
  "11111111-1111-4111-8111-111111111111"

function makeRequest(
  body: unknown,
) {
  return new NextRequest(
    "https://mirava.test/api/visual-engine/sessions/session-1/look",
    {
      method:
        "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body:
        JSON.stringify(body),
    },
  )
}

const validBody = {
  batchId,
  item: {
    category:
      "TOP",
    label:
      "White shirt",
    uploads: [
      {
        path:
          `user-1/session-look-staging/session-1/${batchId}/front.jpg`,
        mimeType:
          "image/jpeg",
        bytes:
          2048,
        viewKey:
          "FRONT",
      },
    ],
  },
}

describe(
  "MIRAVA session look finalize route",
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      mocks.verifySession
        .mockResolvedValue({
          userId:
            "user-1",
        })

      mocks.checkRateLimit
        .mockResolvedValue({
          success: true,
        })

      mocks.launchEnabled
        .mockReturnValue(true)

      mocks.finalizeLook
        .mockResolvedValue({
          id:
            "look-item-1",
          category:
            "TOP",
          label:
            "White shirt",
          brand: null,
          description:
            null,
          position: 0,
          assets: [
            {
              mimeType:
                "image/jpeg",
              bytes:
                2048,
              viewKey:
                "FRONT",
            },
          ],
        })

      mocks.getSession
        .mockResolvedValue({
          id:
            "session-1",
          identityProfileId:
            "identity-1",
          config: {
            version: 1,
            mode:
              "CUSTOM_SHOOT",
            setPresetId:
              "white-cyclorama-v1",
            lightingPresetId:
              "soft-v1",
            shotCount: 6,
            lookMode:
              "CUSTOM",
          },
          lookItemCount: 1,
          configurationReady:
            true,
          createdAt:
            "2026-08-08T00:00:00.000Z",
          updatedAt:
            "2026-08-08T00:20:00.000Z",
        })
    })

    it("finalizes one uploaded look item and returns the refreshed session", async () => {
      const response =
        await POST(
          makeRequest(
            validBody,
          ),
          {
            params: {
              id:
                "session-1",
            },
          },
        )

      expect(
        response.status,
      ).toBe(201)

      expect(
        mocks.finalizeLook,
      ).toHaveBeenCalledWith({
        userId:
          "user-1",
        sessionId:
          "session-1",
        batchId,
        input:
          validBody.item,
      })

      expect(
        mocks.getSession,
      ).toHaveBeenCalledWith(
        "user-1",
        "session-1",
      )

      const json =
        await response.json()

      expect(
        json.session
          .configurationReady,
      ).toBe(true)

      expect(
        json.lookItem.id,
      ).toBe(
        "look-item-1",
      )
    })

    it("rejects malformed finalize payloads before touching storage", async () => {
      const response =
        await POST(
          makeRequest({
            batchId:
              "not-a-uuid",
            item: {
              category:
                "TOP",
              uploads: [],
            },
          }),
          {
            params: {
              id:
                "session-1",
            },
          },
        )

      expect(
        response.status,
      ).toBe(400)

      expect(
        mocks.finalizeLook,
      ).not.toHaveBeenCalled()
    })

    it("requires authentication", async () => {
      mocks.verifySession
        .mockResolvedValue(null)

      const response =
        await POST(
          makeRequest(
            validBody,
          ),
          {
            params: {
              id:
                "session-1",
            },
          },
        )

      expect(
        response.status,
      ).toBe(401)

      expect(
        mocks.finalizeLook,
      ).not.toHaveBeenCalled()
    })

    it("maps a reference-mode session conflict to 409", async () => {
      mocks.finalizeLook
        .mockRejectedValue(
          new MiravaSessionLookStoreError(
            "CUSTOM_LOOK_REQUIRED",
            "reference mode",
          ),
        )

      const response =
        await POST(
          makeRequest(
            validBody,
          ),
          {
            params: {
              id:
                "session-1",
            },
          },
        )

      expect(
        response.status,
      ).toBe(409)
    })
  },
)
