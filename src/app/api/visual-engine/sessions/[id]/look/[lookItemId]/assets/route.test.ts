import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(
    () => ({
      verify:
        vi.fn(),
      launch:
        vi.fn(),
      rate:
        vi.fn(),
      addAssets:
        vi.fn(),
      getDraft:
        vi.fn(),
    }),
  )

vi.mock(
  "@/lib/auth",
  () => ({
    verifySession:
      mocks.verify,
  }),
)

vi.mock(
  "@/lib/mirava/server-config",
  () => ({
    isMiravaPublicLaunchEnabled:
      mocks.launch,
  }),
)

vi.mock(
  "@/lib/rate-limit",
  () => ({
    checkRateLimit:
      mocks.rate,
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
      ) {
        super(code)
        this.name =
          "MiravaSessionLookStoreError"
        this.code =
          code
      }
    }

    return {
      MiravaSessionLookStoreError:
        MockLookStoreError,
      addMiravaSessionLookAssets:
        mocks.addAssets,
    }
  },
)

vi.mock(
  "@/lib/mirava/session-builder/session-store",
  () => ({
    getMiravaSessionBuilderDraft:
      mocks.getDraft,
  }),
)

import {
  MiravaSessionLookStoreError,
} from "@/lib/mirava/session-builder/look-store"

import {
  POST,
} from "./route"

describe(
  "MIRAVA add existing look asset route",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        mocks.verify
          .mockResolvedValue({
            userId:
              "user-1",
          })

        mocks.launch
          .mockReturnValue(
            true,
          )

        mocks.rate
          .mockResolvedValue({
            success:
              true,
          })

        mocks.addAssets
          .mockResolvedValue(
            undefined,
          )

        mocks.getDraft
          .mockResolvedValue({
            id:
              "session-1",
            lookItems:
              [],
          })
      },
    )

    it(
      "adds views and returns the refreshed session",
      async () => {
        const request =
          new Request(
            "http://localhost/test",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  batchId:
                    "batch-1",
                  uploads: [
                    {
                      path:
                        "staged.jpg",
                    },
                  ],
                }),
            },
          )

        const response =
          await POST(
            request as never,
            {
              params: {
                id:
                  "session-1",
                lookItemId:
                  "look-1",
              },
            },
          )

        expect(
          response.status,
        ).toBe(
          200,
        )

        expect(
          mocks.addAssets,
        ).toHaveBeenCalledWith({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          batchId:
            "batch-1",
          input: [
            {
              path:
                "staged.jpg",
            },
          ],
        })

        const payload =
          await response.json()

        expect(
          payload.session?.id ??
          payload.data?.session?.id,
        ).toBe(
          "session-1",
        )
      },
    )

    it(
      "maps the six-view limit to conflict",
      async () => {
        mocks.addAssets
          .mockRejectedValue(
            new MiravaSessionLookStoreError(
              "ASSET_LIMIT_REACHED",
              "Asset limit reached.",
            ),
          )

        const request =
          new Request(
            "http://localhost/test",
            {
              method:
                "POST",
              body:
                JSON.stringify({
                  batchId:
                    "batch-1",
                  uploads:
                    [],
                }),
            },
          )

        const response =
          await POST(
            request as never,
            {
              params: {
                id:
                  "session-1",
                lookItemId:
                  "look-1",
              },
            },
          )

        expect(
          response.status,
        ).toBe(
          409,
        )
      },
    )
  },
)
