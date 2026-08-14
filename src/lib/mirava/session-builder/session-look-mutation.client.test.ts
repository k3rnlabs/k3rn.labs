import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  deleteMiravaSessionLookItemClient,
  updateMiravaSessionLookItemClient,
} from "./session-look-upload.client"

describe(
  "MIRAVA persisted look item mutation client",
  () => {
    afterEach(
      () => {
        vi.unstubAllGlobals()
      },
    )

    it(
      "PATCHes the exact persisted item endpoint and returns the refreshed session",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue({
              ok: true,
              json:
                async () => ({
                  session: {
                    id:
                      "session-1",
                    lookItems:
                      [],
                  },
                }),
            })

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        const result =
          await updateMiravaSessionLookItemClient({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            locale:
              "fr",
            input: {
              category:
                "DRESS",
              label:
                "Robe noire",
              brand:
                null,
              description:
                null,
            },
          })

        expect(
          result.id,
        ).toBe(
          "session-1",
        )

        expect(
          fetchMock,
        ).toHaveBeenCalledWith(
          "/api/visual-engine/sessions/session-1/look/look-1",
          expect.objectContaining({
            method:
              "PATCH",
            cache:
              "no-store",
            body:
              JSON.stringify({
                category:
                  "DRESS",
                label:
                  "Robe noire",
                brand:
                  null,
                description:
                  null,
              }),
          }),
        )
      },
    )

    it(
      "DELETEs the exact persisted item endpoint without a request body",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue({
              ok: true,
              json:
                async () => ({
                  deleted:
                    true,
                  session: {
                    id:
                      "session-1",
                    lookItems:
                      [],
                  },
                }),
            })

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        await deleteMiravaSessionLookItemClient({
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          locale:
            "fr",
        })

        expect(
          fetchMock,
        ).toHaveBeenCalledWith(
          "/api/visual-engine/sessions/session-1/look/look-1",
          expect.objectContaining({
            method:
              "DELETE",
            cache:
              "no-store",
          }),
        )

        const options =
          fetchMock.mock
            .calls[0][1]

        expect(
          options.body,
        ).toBeUndefined()
      },
    )

    it(
      "surfaces the server mutation message on failure",
      async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn()
            .mockResolvedValue({
              ok: false,
              json:
                async () => ({
                  error:
                    "Ce look MIRAVA ne peut plus être modifié.",
                }),
            }),
        )

        await expect(
          deleteMiravaSessionLookItemClient({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            locale:
              "fr",
          }),
        ).rejects.toThrow(
          "Ce look MIRAVA ne peut plus être modifié.",
        )
      },
    )
  },
)
