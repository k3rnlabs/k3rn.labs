import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(
    () => ({
      uploadToSignedUrl:
        vi.fn(),
      createClient:
        vi.fn(),
    }),
  )

vi.mock(
  "@supabase/supabase-js",
  () => ({
    createClient:
      mocks.createClient,
  }),
)

import {
  replaceMiravaSessionLookAssetClient,
} from "./session-look-upload.client"

describe(
  "MIRAVA replace look asset client",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        process.env
          .NEXT_PUBLIC_SUPABASE_URL =
          "https://example.supabase.co"

        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY =
          "anon-key"

        mocks.uploadToSignedUrl
          .mockResolvedValue({
            error:
              null,
          })

        mocks.createClient
          .mockReturnValue({
            storage: {
              from:
                () => ({
                  uploadToSignedUrl:
                    mocks.uploadToSignedUrl,
                }),
            },
          })
      },
    )

    afterEach(
      () => {
        vi.unstubAllGlobals()
      },
    )

    it(
      "stages and patches the exact existing asset",
      async () => {
        const file =
          new File(
            [
              "replacement",
            ],
            "replacement.webp",
            {
              type:
                "image/webp",
            },
          )

        const fetchMock =
          vi.fn()
            .mockResolvedValueOnce({
              ok:
                true,
              json:
                async () => ({
                  batchId:
                    "123e4567-e89b-42d3-a456-426614174000",
                  bucket:
                    "private",
                  uploads: [
                    {
                      path:
                        "user/session-look-staging/session/batch/replacement.webp",
                      token:
                        "token",
                    },
                  ],
                }),
            })
            .mockResolvedValueOnce({
              ok:
                true,
              json:
                async () => ({
                  replaced:
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

        const result =
          await replaceMiravaSessionLookAssetClient({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            locale:
              "fr",
            file: {
              file,
              viewKey:
                "BACK",
            },
          })

        expect(
          result.id,
        ).toBe(
          "session-1",
        )

        expect(
          mocks.uploadToSignedUrl,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          fetchMock,
        ).toHaveBeenNthCalledWith(
          2,
          "/api/visual-engine/sessions/session-1/look/look-1/assets/asset-1",
          expect.objectContaining({
            method:
              "PATCH",
            cache:
              "no-store",
          }),
        )

        const request =
          fetchMock.mock.calls[
            1
          ][
            1
          ] as {
            body?: string
          }

        expect(
          JSON.parse(
            request.body ??
            "{}",
          ),
        ).toMatchObject({
          upload: {
            mimeType:
              "image/webp",
            viewKey:
              "BACK",
          },
        })
      },
    )

    it(
      "rejects an invalid asset before staging",
      async () => {
        const fetchMock =
          vi.fn()

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        await expect(
          replaceMiravaSessionLookAssetClient({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "",
            locale:
              "fr",
            file: {
              file:
                new File(
                  [
                    "x",
                  ],
                  "x.webp",
                  {
                    type:
                      "image/webp",
                  },
                ),
              viewKey:
                "FRONT",
            },
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
