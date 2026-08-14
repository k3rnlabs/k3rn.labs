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
  vi.hoisted(
    () => ({
      verifySession:
        vi.fn(),
      checkRateLimit:
        vi.fn(),
      launchEnabled:
        vi.fn(),
      updateLook:
        vi.fn(),
      deleteLook:
        vi.fn(),
      getSession:
        vi.fn(),
    }),
  )

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
      ) {
        super(code)
        this.code =
          code
      }
    }

    return {
      MiravaSessionLookStoreError:
        MockLookStoreError,
      updateMiravaSessionLookItem:
        mocks.updateLook,
      deleteMiravaSessionLookItem:
        mocks.deleteLook,
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
      ) {
        super(code)
        this.code =
          code
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
  DELETE,
  PATCH,
} from "./route"

function request(
  method:
    | "PATCH"
    | "DELETE",
  body?:
    unknown,
) {
  return new NextRequest(
    "https://mirava.test/api/visual-engine/sessions/session-1/look/look-1",
    {
      method,
      headers:
        body === undefined
          ? undefined
          : {
              "Content-Type":
                "application/json",
            },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(
              body,
            ),
    },
  )
}

const context = {
  params: {
    id:
      "session-1",
    lookItemId:
      "look-1",
  },
}

describe(
  "MIRAVA persisted look item mutation route",
  () => {
    beforeEach(
      () => {
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
          .mockReturnValue(
            true,
          )

        mocks.updateLook
          .mockResolvedValue(
            undefined,
          )

        mocks.deleteLook
          .mockResolvedValue(
            undefined,
          )

        mocks.getSession
          .mockResolvedValue({
            id:
              "session-1",
            lookItems: [],
          })
      },
    )

    it(
      "updates an owned persisted look item and returns the refreshed session",
      async () => {
        const response =
          await PATCH(
            request(
              "PATCH",
              {
                category:
                  "DRESS",
                label:
                  "Black dress",
              },
            ),
            context,
          )

        expect(
          response.status,
        ).toBe(200)

        expect(
          mocks.updateLook,
        ).toHaveBeenCalledWith({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          input: {
            category:
              "DRESS",
            label:
              "Black dress",
          },
        })

        expect(
          mocks.getSession,
        ).toHaveBeenCalledWith(
          "user-1",
          "session-1",
        )
      },
    )

    it(
      "deletes an owned persisted look item and returns the refreshed session",
      async () => {
        const response =
          await DELETE(
            request(
              "DELETE",
            ),
            context,
          )

        expect(
          response.status,
        ).toBe(200)

        const json =
          await response.json()

        expect(
          json.deleted,
        ).toBe(true)

        expect(
          mocks.deleteLook,
        ).toHaveBeenCalledWith({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
        })
      },
    )

    it(
      "rejects an empty metadata patch before store mutation",
      async () => {
        const response =
          await PATCH(
            request(
              "PATCH",
              {},
            ),
            context,
          )

        expect(
          response.status,
        ).toBe(400)

        expect(
          mocks.updateLook,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "requires authentication",
      async () => {
        mocks.verifySession
          .mockResolvedValue(
            null,
          )

        const response =
          await DELETE(
            request(
              "DELETE",
            ),
            context,
          )

        expect(
          response.status,
        ).toBe(401)

        expect(
          mocks.deleteLook,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
