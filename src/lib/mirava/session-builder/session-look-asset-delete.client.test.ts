import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  deleteMiravaSessionLookAssetClient,
} from "./session-look-upload.client"

describe(
  "MIRAVA look asset delete client",
  () => {
    afterEach(
      () => {
        vi.unstubAllGlobals()
      },
    )

    it(
      "deletes the exact persisted asset and returns the refreshed session",
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
                    identityProfileId:
                      null,
                    lookItemCount:
                      1,
                    lookItems:
                      [],
                    configurationReady:
                      false,
                    config:
                      {},
                    createdAt:
                      "2026-08-11T00:00:00.000Z",
                    updatedAt:
                      "2026-08-11T00:00:00.000Z",
                  },
                }),
            })

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        const result =
          await deleteMiravaSessionLookAssetClient({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            locale:
              "fr",
          })

        expect(
          result.id,
        ).toBe(
          "session-1",
        )

        expect(
          fetchMock,
        ).toHaveBeenCalledWith(
          "/api/visual-engine/sessions/session-1/look/look-1/assets/asset-1",
          {
            method:
              "DELETE",
            cache:
              "no-store",
          },
        )
      },
    )

    it(
      "rejects a missing asset id before calling the API",
      async () => {
        const fetchMock =
          vi.fn()

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        await expect(
          deleteMiravaSessionLookAssetClient({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "",
            locale:
              "fr",
          }),
        ).rejects.toThrow(
          "MIRAVA_LOOK_INVALID_ASSET",
        )

        expect(
          fetchMock,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
